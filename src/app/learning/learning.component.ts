import {Component, DestroyRef, ElementRef, HostListener, inject, signal, viewChild} from '@angular/core';
import {Word} from '../models/word.model';
import {SrsService} from '../services/srs.service';
import {FormsModule} from '@angular/forms';
import {VocabularyDBService} from '../services/vocabulary-db.service';
import {filter, from, startWith, Subject, switchMap, throttleTime} from 'rxjs';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {WordDataService} from '../services/word-data.service';
import {AsyncPipe} from '@angular/common';

@Component({
  selector: 'app-learning',
  templateUrl: './learning.component.html',
  imports: [
    FormsModule,
    AsyncPipe
  ],
  styleUrls: ['./learning.component.scss']
})
export class LearningComponent {
  wordsForReview: Word[] = [];
  userAnswer: string = '';

  protected currentWord = signal<Word | null>(null);
  protected wordsForReviewLength = signal(0);
  protected isCorrect = signal(false);
  protected currentIndex = signal(0);
  protected showResult = signal(false);
  protected blockEnter = signal(false);
  protected statisticsSubject = new Subject();
  protected statistics$ = this.statisticsSubject.pipe(
    startWith(null),
    switchMap(() => from(this.wordDataService.getStatisticsByProgressPercentage()))
  )

  private readonly wordDataService = inject(WordDataService);
  private readonly vocabularyDbService = inject(VocabularyDBService);
  private readonly srsService = inject(SrsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly inputElement = viewChild('inputElement', {read: ElementRef});

  private handleEnterKeySubject = new Subject();
  private _ = this.handleEnterKeySubject.pipe(
    takeUntilDestroyed(this.destroyRef),
    filter(() => !this.blockEnter()),
    throttleTime(500),
  ).subscribe(() => {
    if (this.currentWord()) {
      if (this.showResult()) {
        this.nextWord();
      } else {
        this.blockEnter.set(true);
        this.checkAnswer().finally();
      }
    }
  })

  async startSession() {
    this.wordsForReview = await this.vocabularyDbService.getWordsForReview();

    this.wordsForReviewLength.set(this.wordsForReview.length);
    this.currentIndex.set(0);
    this.currentWord.set(this.wordsForReview[this.currentIndex()]);
    this.userAnswer = '';
    setTimeout(() => {
      this.inputElement()?.nativeElement.focus();
    })
  }

  nextWord(): void {
    this.currentIndex.update(count => count + 1);
    this.showResult.set(false);
    this.currentWord.set(this.wordsForReview[this.currentIndex()]);
    this.userAnswer = '';
    setTimeout(() => {
      this.inputElement()?.nativeElement.focus();
    })
  }

  async checkAnswer() {
    const currentWord = this.currentWord();
    if (!currentWord) return;

    this.showResult.set(true);

    this.isCorrect.set(this.userAnswer.trim().toLowerCase() === currentWord.german.toLowerCase());

    const grade = this.isCorrect() ? 1 : 0;
    const updatedWord = this.srsService.calculateNextReview(currentWord, grade);

    await this.vocabularyDbService.putWord(updatedWord);

    if (this.isCorrect()) {
      setTimeout(() => {
        this.blockEnter.set(false);
        this.showResult.set(false);

        this.nextWord();
      }, 1000)
    } else {
      this.blockEnter.set(false);
    }
  }

  @HostListener('window:keyup.enter', ['$event'])
  handleEnterKey(event: Event): void {
    if (this.userAnswer) {
      this.handleEnterKeySubject.next(event);
    }
  }

  getCorrectAnswer(): string {
    const currentWord = this.currentWord();
    return currentWord ? currentWord.german : '';
  }

  onNext(): void {
    this.nextWord()
  }
}
