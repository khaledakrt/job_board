export const PROVIDER_LIST_PAGE_SIZE = 5;

export function paginateSlice<T>(items: T[], page: number, pageSize = PROVIDER_LIST_PAGE_SIZE): T[] {
  const safePage = Math.max(1, page);
  const start = (safePage - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

export function totalPages(count: number, pageSize = PROVIDER_LIST_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(count / pageSize) || 1);
}

export function pageRange(count: number, pageSize = PROVIDER_LIST_PAGE_SIZE): number[] {
  const n = totalPages(count, pageSize);
  return Array.from({ length: n }, (_, i) => i + 1);
}
