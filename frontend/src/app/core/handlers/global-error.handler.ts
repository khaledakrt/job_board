import { ErrorHandler, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  handleError(error: unknown): void {
    if (!environment.production) {
      console.error(error);
    }

    const banner = document.getElementById('bootstrap-error');
    if (!banner) {
      return;
    }

    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : 'Une erreur est survenue au chargement de JobBoard.';

    banner.style.display = 'block';
    banner.textContent = message;
  }
}
