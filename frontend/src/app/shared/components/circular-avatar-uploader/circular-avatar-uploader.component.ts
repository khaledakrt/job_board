import { Component, computed, ElementRef, input, output, signal, viewChild } from '@angular/core';

@Component({
  selector: 'app-circular-avatar-uploader',
  standalone: true,
  templateUrl: './circular-avatar-uploader.component.html',
  styleUrl: './circular-avatar-uploader.component.css',
})
export class CircularAvatarUploaderComponent {
  readonly currentAvatarUrl = input<string | null>(null);
  readonly fileSelected = output<File>();

  readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');
  readonly previewUrl = signal<string | null>(null);
  readonly dragOver = signal(false);

  readonly displayUrl = computed(() => this.previewUrl() || this.currentAvatarUrl());

  openPicker(): void {
    this.fileInput()?.nativeElement.click();
  }

  onFileChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => this.previewUrl.set(reader.result as string);
    reader.readAsDataURL(file);
    this.fileSelected.emit(file);
  }
}
