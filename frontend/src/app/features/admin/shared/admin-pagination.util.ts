import { PaginationMeta } from '../../../core/models/pagination.model';

export function adminPageSummary(
  pagination: PaginationMeta | null,
  itemLabel: string
): string {
  if (!pagination || pagination.totalItems === 0) {
    return `Aucun ${itemLabel}`;
  }
  const start = (pagination.page - 1) * pagination.limit + 1;
  const end = Math.min(pagination.page * pagination.limit, pagination.totalItems);
  const plural = pagination.totalItems > 1 ? 's' : '';
  return `${start}–${end} sur ${pagination.totalItems} ${itemLabel}${plural}`;
}

export type AdminPageToken = number | 'gap';

/**
 * Premières pages, dernières pages, et les pages autour de la page courante.
 * Un « gap » sépare les groupes quand il y a beaucoup de pages.
 */
export function adminPageTokens(pagination: PaginationMeta | null): AdminPageToken[] {
  if (!pagination || pagination.totalPages < 1) return [];
  const { page, totalPages } = pagination;
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const wanted = new Set<number>([
    1,
    2,
    totalPages - 1,
    totalPages,
    page - 1,
    page,
    page + 1,
  ]);
  const sorted = [...wanted].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
  const tokens: AdminPageToken[] = [];
  for (let i = 0; i < sorted.length; i += 1) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) tokens.push('gap');
    tokens.push(sorted[i]);
  }
  return tokens;
}

/** Page numbers to display (caps long lists). */
export function adminPageNumbers(pagination: PaginationMeta | null): number[] {
  return adminPageTokens(pagination).filter((token): token is number => token !== 'gap');
}
