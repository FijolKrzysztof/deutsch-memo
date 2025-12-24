import { Injectable } from '@angular/core';
import { Word } from '../models/word.model';

@Injectable({
  providedIn: 'root'
})
export class SrsService {
  private readonly MS_IN_DAY = 24 * 60 * 60 * 1000;
  private readonly MIN_EASE_FACTOR = 1.3;
  private readonly MAX_INTERVAL_DAYS = 14;

  calculateNextReview(word: Word, grade: 1 | 0): Word {
    let newWord: Word = {
      ...word,
      interval: word.interval || 1,
      easeFactor: word.easeFactor || 2
    };

    if (grade === 1) {
      newWord.repetitionCounter++;

      newWord.easeFactor = newWord.easeFactor + 0.1;
      newWord.easeFactor = Math.max(this.MIN_EASE_FACTOR, newWord.easeFactor);

      const easeFactorInterval = Math.round(newWord.interval * newWord.easeFactor);

      if (newWord.repetitionCounter === 1) {
        newWord.interval = Math.min(1, easeFactorInterval);
      } else if (newWord.repetitionCounter === 2) {
        newWord.interval = Math.min(3, easeFactorInterval);
      } else {
        newWord.interval = easeFactorInterval;
      }

    } else if (grade === 0) {
      newWord.repetitionCounter = 0;

      newWord.easeFactor = newWord.easeFactor - 0.2;
      newWord.easeFactor = Math.max(this.MIN_EASE_FACTOR, newWord.easeFactor);

      newWord.interval = 0;
    }

    const now = Date.now();
    newWord.nextReviewDate = now + (newWord.interval * this.MS_IN_DAY);

    const cappedInterval = Math.min(newWord.interval, this.MAX_INTERVAL_DAYS);
    newWord.progressPercentage = Math.round(
      (cappedInterval / this.MAX_INTERVAL_DAYS) * 100
    );

    return newWord;
  }
}
