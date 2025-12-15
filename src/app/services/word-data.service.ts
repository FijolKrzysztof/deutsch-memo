import {inject, Injectable} from '@angular/core';
import {Word} from '../models/word.model';
import {BehaviorSubject} from 'rxjs';
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
    console.log('words2', words)


    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(words));


    this.wordsSubject.next(words);
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
