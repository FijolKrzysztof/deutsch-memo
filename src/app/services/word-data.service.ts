import {Injectable} from '@angular/core';
import {Word} from '../models/word.model';
import {BehaviorSubject, Observable} from 'rxjs';
import * as words from '../const/words.json'

@Injectable({
  providedIn: 'root'
})
export class WordDataService {
  private readonly STORAGE_KEY = 'learning_app_words_state';
  private readonly wordsSubject: BehaviorSubject<Word[]> = new BehaviorSubject<Word[]>([]);
  public words$: Observable<Word[]> = this.wordsSubject.asObservable();

  constructor() {
  }

  private saveWords(words: Word[]): void {
    console.log('words2', words)


    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(words));


    this.wordsSubject.next(words);
  }

  updateWord(updatedWord: Word): void {
    const currentWords = this.wordsSubject.getValue();
    const index = currentWords.findIndex(w => w.english === updatedWord.english && w.german === updatedWord.german);

    if (index !== -1) {
      currentWords[index] = updatedWord;
      this.saveWords(currentWords);
    }
  }

  exportProgress(): void {
    const data = this.wordsSubject.getValue();
    const json = JSON.stringify(data);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'deutschmemo_progress.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  importProgress(jsonText: string): void {
    try {
      const importedWords: Word[] = JSON.parse(jsonText);
      if (Array.isArray(importedWords) && importedWords.every(w => w.english && w.german && w.nextReviewDate)) {
        this.saveWords(importedWords);
        alert(`Zaimportowano ${importedWords.length} postępów. Uruchom sesję nauki ponownie.`);
      } else {
        throw new Error('Niepoprawny format pliku postępu.');
      }
    } catch (e) {
      alert('Błąd podczas wczytywania pliku postępów.');
    }
  }

  getWordsForReview(): Word[] {
    const now = Date.now();
    return [];
    // return this.wordsSubject.getValue()
    //   .filter(word => word.nextReviewDate <= now)
    //   .sort(() => 0.5 - Math.random());
  }
}
