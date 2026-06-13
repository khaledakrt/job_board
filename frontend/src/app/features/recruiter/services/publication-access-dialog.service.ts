import { Injectable, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';

const SUBSCRIPTION_ERRORS = new Set([
  'An active company subscription is required to publish this job',
  'An active company subscription is required to perform this action',
]);

@Injectable({ providedIn: 'root' })
export class PublicationAccessDialogService {
  private readonly confirmDialog = inject(ConfirmDialogService);

  isPublishBlockedError(err: HttpErrorResponse): boolean {
    return SUBSCRIPTION_ERRORS.has(err.error?.message);
  }

  isPublishBlockedMessage(message: string | undefined): boolean {
    return SUBSCRIPTION_ERRORS.has(message ?? '');
  }

  showPublishBlocked(): Promise<void> {
    return this.confirmDialog.alert({
      title: 'Publication non autorisée',
      message:
        'Cette offre ne peut pas être publiée pour le moment.\n\nVotre entreprise doit avoir un abonnement actif ou un accès gratuit accordé par l’administrateur.\n\nVous pouvez conserver cette offre en brouillon et la publier plus tard.',
      confirmLabel: 'Compris',
    });
  }
}
