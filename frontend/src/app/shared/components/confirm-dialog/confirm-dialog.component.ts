import { Component, HostListener, inject } from '@angular/core';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.css',
})
export class ConfirmDialogComponent {
  readonly confirmDialog = inject(ConfirmDialogService);

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.confirmDialog.state()) {
      this.confirmDialog.resolve(false);
    }
  }

  cancel(): void {
    this.confirmDialog.resolve(false);
  }

  confirm(): void {
    this.confirmDialog.resolve(true);
  }
}
