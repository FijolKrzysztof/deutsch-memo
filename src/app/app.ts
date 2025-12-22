import {Component, inject} from '@angular/core';
import {WordDataService} from './services/word-data.service';
import {LearningComponent} from './learning/learning.component';

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

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = () => {
      const text = reader.result as string;
      this.wordDataService.importProgress(text);
      input.value = '';
    };

    reader.readAsText(file);
  }

  exportProgress(): void {
    this.wordDataService.exportProgress().finally();
  }
}
