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

/** Page numbers to display (caps long lists). */
export function adminPageNumbers(pagination: PaginationMeta | null): number[] {
  if (!pagination) return [];
  const { page, totalPages } = pagination;
  if (totalPages <= 9) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages = new Set<number>([1, totalPages, page, page - 1, page + 1]);
  return [...pages].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
}
