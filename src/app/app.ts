import {Component, inject} from '@angular/core';
import {WordDataService} from './services/word-data.service';
import {LearningComponent} from './learning/learning.component';
import {VocabularyDBService} from './services/vocabulary-db.service';
import {Word} from './models/word.model';

@Component({
  selector: 'app-root',
  imports: [
    LearningComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private readonly wordDataService = inject(WordDataService);
  private readonly vocabularyDbService = inject(VocabularyDBService);

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      const text = reader.result as string;
      this.importProgress(text);
      input.value = '';
    };

    reader.readAsText(file);
  }

  exportProgress(): void {
    this.wordDataService.exportProgress().finally();
  }

  private hasAllFields(w: Word): boolean {
    return !isNaN(w.id) && !!w.english && !!w.german && !isNaN(w.repetitionCounter) && !isNaN(w.nextReviewDate) && !isNaN(w.easeFactor) && !isNaN(w.interval);
  }

  private importProgress(jsonText: string): void {
    try {
      const importedWords: Word[] = JSON.parse(jsonText);
      if (Array.isArray(importedWords) && importedWords.every(w => this.hasAllFields(w))) {
        this.vocabularyDbService.putAllWords(importedWords)
          .then(() => {
            alert(`Imported ${importedWords.length} words`);
          })
          .catch(err => {
            console.error(err);
            alert('Error importing data into local database');
          });
      } else {
        alert('Wrong file format');
      }
    } catch (e) {
      console.error(e);
      alert('Error while loading import data');
    }
  }
}
