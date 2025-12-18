import {inject, Injectable} from '@angular/core';
import {Word} from '../models/word.model';
import {BehaviorSubject, timer} from 'rxjs';
import {VocabularyDBService} from './vocabulary-db.service';

@Injectable({
  providedIn: 'root'
})
export class WordDataService {
  private readonly STORAGE_KEY = 'learning_app_words_state';
  private readonly wordsSubject: BehaviorSubject<Word[]> = new BehaviorSubject<Word[]>([]);
  private readonly vocabularyDbService = inject(VocabularyDBService);

  constructor() {
  }

  private saveWords(words: Word[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(words));


    this.wordsSubject.next(words);
  }

  async getStatisticsByProgressPercentage() {
    const statistics = [];

    const ranges = [
      {min: 0, max: 0, label: '0%'},
      {min: 1, max: 24, label: '> 0%'},
      {min: 25, max: 49, label: '> 25%'},
      {min: 50, max: 74, label: '> 50%'},
      {min: 75, max: 99, label: '> 75%'},
      {min: 100, max: 100, label: '100%'},
    ]

    let allWords = await this.vocabularyDbService.getTotalWordsCount();

    const delay = (ms: number) => {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    if (allWords === 0) {
      await delay(100);

      allWords = await this.vocabularyDbService.getTotalWordsCount();
    }

    for (const range of ranges) {
      const count = await this.vocabularyDbService.countWordsInRange(range.min, range.max);

      statistics.push({
        label: range.label,
        count: count,
        range: range,
        progress: Math.round((count / allWords) * 100) ,
        total: allWords,
      });
    }

    return statistics;
  }

  async exportProgress() {
    const data = await this.vocabularyDbService.getAllWords();
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
        alert(`Imported ${importedWords.length} records.`);
      } else {
        throw new Error('Invalid file format.');
      }
    } catch (e) {
      alert('Error uploading file.');
    }
  }
}
