import { ErrorHandler, Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
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

    if (this.isExpectedCandidateOnboardingError(error)) {
      banner.style.display = 'none';
      banner.textContent = '';
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

  private isExpectedCandidateOnboardingError(error: unknown): boolean {
    if (!(error instanceof HttpErrorResponse)) return false;
    if (error.status !== 404) return false;

    const url = error.url || '';
    return (
      url.includes('/candidate/profile') ||
      url.includes('/candidate/dashboard/summary') ||
      url.includes('/candidate/dashboard/recommended-jobs')
    );
  }
}
