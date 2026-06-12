import { APP_ROUTES } from '../../../core/constants/routes.constant';
import { CatalogPublishStatus } from '../../../core/models/admin.model';

export type OfferingKind = 'formations' | 'events';

export const OFFERING_STATUS_LABELS: Record<CatalogPublishStatus, string> = {
  pending: 'En attente',
  published: 'Publié',
  rejected: 'Refusé',
};

export function offeringTitle(kind: OfferingKind): string {
  return kind === 'formations' ? 'Formations' : 'Événements';
}

export function offeringListRoute(kind: OfferingKind): string {
  return kind === 'formations'
    ? APP_ROUTES.ADMIN.TRAINING_FORMATIONS
    : APP_ROUTES.ADMIN.TRAINING_EVENTS;
}

export function offeringPublicRoute(kind: OfferingKind, id: string): string {
  return kind === 'formations'
    ? APP_ROUTES.PUBLIC.FORMATION(id)
    : APP_ROUTES.PUBLIC.EVENT(id);
}

export function offeringItemLabel(kind: OfferingKind): string {
  return kind === 'formations' ? 'formation' : 'événement';
}

export function offeringSubtitle(kind: OfferingKind): string {
  return kind === 'formations'
    ? 'Validez ou refusez les formations soumises par les centres avant affichage sur le catalogue public.'
    : 'Validez ou refusez les événements soumis par les centres avant affichage sur le catalogue public.';
}
