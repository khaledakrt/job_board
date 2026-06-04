/** Normalise tags / langues / avantages renvoyés par l’API (JSON, chaîne, tableau). */
export function normalizeStringList(value: unknown): string[] {
  if (value == null) return [];

  if (Array.isArray(value)) {
    return value
      .map((item) => String(item ?? '').trim())
      .filter((s) => s.length > 0);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return normalizeStringList(parsed);
      }
    } catch {
      /* plain comma-separated */
    }
    return trimmed
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  return [];
}

export function toNullableStringList(items: string[]): string[] | null {
  return items.length > 0 ? items : null;
}
