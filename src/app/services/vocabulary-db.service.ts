import { Injectable } from '@angular/core';
import {Word} from '../models/word.model';

@Injectable({
  providedIn: 'root'
})
export class VocabularyDBService {
  private DB_NAME = 'VocabularyDB';
  private DB_VERSION = 2;
  private STORE_NAME = 'vocabulary';
  private db!: IDBDatabase;
  private BY_NEXT_REVIEW_DATE = 'by_nextReviewDate';
  private BY_PROGRESS_PERCENTAGE = 'by_progressPercentage';

  constructor() {
    this.openDB().finally();
  }

  private openDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.db) {
        resolve();
        return;
      }

      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => {
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        this.db = request.result;
        if (!this.db.objectStoreNames.contains(this.STORE_NAME)) {
          const store = this.db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
          this.createIndexes(store);
          this.initializeData().finally();
        } else {
          const store = (event.target as IDBOpenDBRequest).transaction!.objectStore(this.STORE_NAME);
          this.createIndexes(store);
        }
      };
    });
  }

  private createIndexes(store: IDBObjectStore) {
    if (!store.indexNames.contains(this.BY_PROGRESS_PERCENTAGE)) {
      store.createIndex(this.BY_PROGRESS_PERCENTAGE, 'progressPercentage', { unique: false });
      console.log(`Created index ${this.BY_PROGRESS_PERCENTAGE}.`);
    }

    if (!store.indexNames.contains(this.BY_NEXT_REVIEW_DATE)) {
      store.createIndex(this.BY_NEXT_REVIEW_DATE, 'nextReviewDate', { unique: false });
      console.log(`Created index ${this.BY_NEXT_REVIEW_DATE}`);
    }
  }

  private async initializeData() {
    const wordsModule = await import('../const/words.json');
    this.putAllWords(wordsModule.default as Word[]).finally();
  }

  private getObjectStore(mode: IDBTransactionMode): IDBObjectStore {
    const transaction = this.db.transaction([this.STORE_NAME], mode);
    return transaction.objectStore(this.STORE_NAME);
  }

  async putWord(word: Word): Promise<Word> {
    await this.openDB();

    return new Promise((resolve, reject) => {
      const store = this.getObjectStore('readwrite');
      const request = store.put(word);

      request.onsuccess = () => resolve(word);
      request.onerror = () => reject(request.error);
    });
  }

  async putAllWords(words: Word[]): Promise<void> {
    await this.openDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);

      words.forEach(word => {
        store.put(word);
      });
    });
  }

  async getAllWords(): Promise<Word[]> {
    await this.openDB();

    return new Promise((resolve, reject) => {
      const store = this.getObjectStore('readonly');
      const request = store.getAll();

      request.onsuccess = (event: any) => {
        resolve(event.target.result as Word[]);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async clearAllWords(): Promise<void> {
    await this.openDB();

    return new Promise((resolve, reject) => {
      const store = this.getObjectStore('readwrite');
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getTotalWordsCount(): Promise<number> {
    await this.openDB();

    return new Promise((resolve, reject) => {
      const store = this.getObjectStore('readonly');
      const request = store.count();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async countWordsInRange(min: number, max: number): Promise<number> {
    return new Promise(async (resolve, reject) => {
      await this.openDB();

      const store = this.getObjectStore('readonly');
      const range = IDBKeyRange.bound(min, max, false, false);
      const index = store.index(this.BY_PROGRESS_PERCENTAGE);
      const request = index.count(range);

      request.onsuccess = (event: any) => {
        resolve(event.target.result as number);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async getWordsForReview(limit: number = 10): Promise<Word[]> {
    await this.openDB();

    if (!this.db.objectStoreNames.contains(this.STORE_NAME) || !this.db.transaction([this.STORE_NAME], 'readonly').objectStore(this.STORE_NAME).indexNames.contains('by_nextReviewDate')) {
      console.warn("Missing 'by_nextReviewDate' index.");
    }

    return new Promise((resolve, reject) => {
      const now = Date.now();
      const store = this.getObjectStore('readonly');

      const range = IDBKeyRange.upperBound(now, true);

      const index = store.index(this.BY_NEXT_REVIEW_DATE);
      const request = index.openCursor(range, 'next');

      const words: Word[] = [];
      let count = 0;

      request.onsuccess = (event: any) => {
        const cursor = event.target.result;

        if (cursor && count < limit) {
          const word = cursor.value as Word;
          if (!word.progressPercentage || word.progressPercentage < 100) {
            words.push(cursor.value as Word);
            count++;
          }

          cursor.continue();
        } else {
          resolve(words);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }
}
