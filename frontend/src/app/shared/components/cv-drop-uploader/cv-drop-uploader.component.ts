import { Component, output, signal, viewChild, ElementRef } from '@angular/core';

@Component({
  selector: 'app-cv-drop-uploader',
  standalone: true,
  templateUrl: './cv-drop-uploader.component.html',
  styleUrl: './cv-drop-uploader.component.css',
})
export class CvDropUploaderComponent {
  readonly fileSelected = output<File>();
  readonly parsing = output<boolean>();

  readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');
  readonly dragOver = signal(false);
  readonly fileName = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  openPicker(): void {
    this.fileInput()?.nativeElement.click();
  }

  onFileChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.processFile(file);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) this.processFile(file);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(true);
  }

  onDragLeave(): void {
    this.dragOver.set(false);
  }

  private processFile(file: File): void {
    this.errorMessage.set(null);
    if (file.type !== 'application/pdf') {
      this.errorMessage.set('Seuls les fichiers PDF sont acceptés.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      this.errorMessage.set('Le fichier doit faire moins de 10 Mo.');
      return;
    }
    this.fileName.set(file.name);
    this.fileSelected.emit(file);
  }
}
