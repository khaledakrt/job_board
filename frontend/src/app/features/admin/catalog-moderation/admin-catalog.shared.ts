import { APP_ROUTES } from '../../../core/constants/routes.constant';
import { CatalogPublishStatus } from '../../../core/models/admin.model';

export type CatalogKind = 'training-centers' | 'private-institutions';

export const CATALOG_STATUS_LABELS: Record<CatalogPublishStatus, string> = {
  pending: 'En attente',
  published: 'Publié',
  rejected: 'Refusé',
};

export function catalogTitle(kind: CatalogKind): string {
  return kind === 'training-centers' ? 'Centres de formation' : 'Établissements privés';
}

export function catalogListRoute(kind: CatalogKind): string {
  return kind === 'training-centers'
    ? APP_ROUTES.ADMIN.TRAINING_CENTERS
    : APP_ROUTES.ADMIN.PRIVATE_INSTITUTIONS;
}

export function catalogNewRoute(kind: CatalogKind): string {
  return kind === 'training-centers'
    ? APP_ROUTES.ADMIN.TRAINING_CENTER_NEW
    : APP_ROUTES.ADMIN.PRIVATE_INSTITUTION_NEW;
}

export function catalogDetailRoute(kind: CatalogKind, id: string): string {
  return kind === 'training-centers'
    ? APP_ROUTES.ADMIN.TRAINING_CENTER_DETAIL(id)
    : APP_ROUTES.ADMIN.PRIVATE_INSTITUTION_DETAIL(id);
}

export function catalogPublicRoute(kind: CatalogKind, id: string): string {
  return kind === 'training-centers'
    ? APP_ROUTES.PUBLIC.TRAINING_CENTER(id)
    : APP_ROUTES.PUBLIC.PRIVATE_INSTITUTION(id);
}
