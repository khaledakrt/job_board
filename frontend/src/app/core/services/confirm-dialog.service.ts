import { Injectable, signal } from '@angular/core';

export interface ConfirmDialogOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmDanger?: boolean;
}

export interface ConfirmDialogState {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  confirmDanger: boolean;
  mode: 'confirm' | 'alert';
}

@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  private resolver: ((value: boolean) => void) | null = null;

  readonly state = signal<ConfirmDialogState | null>(null);

  confirm(options: ConfirmDialogOptions): Promise<boolean> {
    if (this.resolver) {
      this.resolve(false);
    }

    return new Promise<boolean>((resolve) => {
      this.resolver = resolve;
      this.state.set({
        title: options.title ?? 'Confirmer l\'action',
        message: options.message,
        confirmLabel: options.confirmLabel ?? 'Confirmer',
        cancelLabel: options.cancelLabel ?? 'Annuler',
        confirmDanger: options.confirmDanger ?? false,
        mode: 'confirm',
      });
    });
  }

  alert(options: Omit<ConfirmDialogOptions, 'cancelLabel' | 'confirmDanger'>): Promise<void> {
    if (this.resolver) {
      this.resolve(false);
    }

    return new Promise<void>((resolve) => {
      this.resolver = () => resolve();
      this.state.set({
        title: options.title ?? 'Information',
        message: options.message,
        confirmLabel: options.confirmLabel ?? 'Compris',
        cancelLabel: '',
        confirmDanger: false,
        mode: 'alert',
      });
    });
  }

  resolve(confirmed: boolean): void {
    const resolveFn = this.resolver;
    this.resolver = null;
    this.state.set(null);
    resolveFn?.(confirmed);
  }
}
