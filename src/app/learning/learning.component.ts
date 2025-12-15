import {Component, DestroyRef, ElementRef, HostListener, inject, OnInit, signal, viewChild} from '@angular/core';
import {Word} from '../models/word.model';
import {SrsService} from '../services/srs.service';
import {FormsModule} from '@angular/forms';
import {VocabularyDBService} from '../services/vocabulary-db.service';
import {Subject, throttleTime} from 'rxjs';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-learning',
  templateUrl: './learning.component.html',
  imports: [
    FormsModule
  ],
  styleUrls: ['./learning.component.scss']
})
export class LearningComponent implements OnInit {
  wordsForReview: Word[] = [];
  currentWord: Word | null = null;
  currentIndex: number = 0;
  userAnswer: string = '';

  protected isCorrect = signal(false);
  protected remainingCount = signal(0);
  protected showResult = signal(false);

  private readonly vocabularyDbService = inject(VocabularyDBService);
  private readonly srsService = inject(SrsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly inputElement = viewChild('inputElement', {read: ElementRef});

  ngOnInit(): void {
    this.startSession().finally();
  }

  private handleEnterKeySubject = new Subject();
  private _ = this.handleEnterKeySubject.pipe(
    takeUntilDestroyed(this.destroyRef),
    throttleTime(500),
  ).subscribe(() => {
    if (this.currentWord) {
      if (this.showResult()) {
        this.nextWord();
      } else {
        this.checkAnswer().finally();
      }
    }
  })

  async startSession() {
    this.wordsForReview = await this.vocabularyDbService.getWordsForReview();

    this.remainingCount.set(this.wordsForReview.length);
    this.currentIndex = 0;
    this.nextWord();
  }

  nextWord(): void {
    this.showResult.set(false);
    this.currentIndex++;
    this.currentWord = this.wordsForReview[this.currentIndex];
    this.userAnswer = '';
    setTimeout(() => {
      this.inputElement()?.nativeElement.focus();
    })
  }

  async checkAnswer() {
    if (!this.currentWord) return;

    this.showResult.set(true);

    this.isCorrect.set(this.userAnswer.trim().toLowerCase() === this.currentWord.german.toLowerCase());

    const grade = this.isCorrect() ? 1 : 0;
    const updatedWord = this.srsService.calculateNextReview(this.currentWord, grade);

    await this.vocabularyDbService.putWord(updatedWord);
    this.remainingCount.update(count => count - 1);

    if (this.isCorrect()) {
      setTimeout(() => {
        this.showResult.set(false);

        this.nextWord();
      }, 1000)
    }
  }

  @HostListener('window:keyup.enter', ['$event'])
  handleEnterKey(event: Event): void {
    this.handleEnterKeySubject.next(event);
  }

  getCorrectAnswer(): string {
    return this.currentWord ? this.currentWord.german : '';
  }

  onNext(): void {
    this.nextWord()
  }
}
