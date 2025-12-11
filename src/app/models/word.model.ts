export interface Word {
  id: number;
  english: string;
  german: string;
  repetitionCounter: number;
  interval: number;
  easeFactor: number;
  nextReviewDate: number;
  progressPercentage: number;
}
