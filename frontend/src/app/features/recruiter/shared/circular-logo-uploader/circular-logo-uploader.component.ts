import {
  Component,
  computed,
  ElementRef,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { resolveUploadUrl } from '../../../../core/utils/asset-url.util';

@Component({
  selector: 'app-circular-logo-uploader',
  standalone: true,
  templateUrl: './circular-logo-uploader.component.html',
  styleUrl: './circular-logo-uploader.component.css',
})
export class CircularLogoUploaderComponent {
  readonly currentLogoUrl = input<string | null>(null);
  readonly disabled = input(false);
  readonly maxSizeMb = input(2);

  readonly fileSelected = output<File>();

  readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  readonly previewUrl = signal<string | null>(null);
  readonly dragOver = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly displayUrl = computed(() => {
    const preview = this.previewUrl();
    if (preview) return preview;
    return resolveUploadUrl(this.currentLogoUrl());
  });

  openPicker(): void {
    if (this.disabled()) {
      return;
    }
    this.fileInput()?.nativeElement.click();
  }

  onFileChange(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    const file = inputEl.files?.[0];
    if (file) {
      this.processFile(file);
    }
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);

    if (this.disabled()) {
      return;
    }

    const file = event.dataTransfer?.files?.[0];
    if (file) {
      this.processFile(file);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (!this.disabled()) {
      this.dragOver.set(true);
    }
  }

  onDragLeave(): void {
    this.dragOver.set(false);
  }

  private processFile(file: File): void {
    this.errorMessage.set(null);

    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      this.errorMessage.set('Seuls les formats JPG, PNG ou WEBP sont acceptés.');
      return;
    }

    if (file.size > this.maxSizeMb() * 1024 * 1024) {
      this.errorMessage.set(`L’image doit faire moins de ${this.maxSizeMb()} Mo.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.previewUrl.set(reader.result as string);
    };
    reader.readAsDataURL(file);

    this.fileSelected.emit(file);
  }
}
