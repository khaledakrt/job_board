const ALLOWED_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'SPAN', 'BR', 'P', 'DIV']);

const FONT_CLASS_PREFIX = 'rte-font-';
const ALLOWED_FONT_IDS = new Set([
  'arial',
  'serif',
  'comic',
  'default',
  'mono',
  'modern',
]);

/** Trois polices très contrastées (sans empattements / serif / manuscrite). */
export const RICH_TEXT_FONTS = [
  {
    id: 'arial',
    label: 'Arial — sans empattements, classique',
    shortLabel: 'Arial',
    className: 'rte-font-arial',
    fontFamily: 'Arial, Helvetica, sans-serif',
  },
  {
    id: 'serif',
    label: 'Georgia — serif, élégante',
    shortLabel: 'Georgia',
    className: 'rte-font-serif',
    fontFamily: 'Georgia, "Times New Roman", Times, serif',
  },
  {
    id: 'comic',
    label: 'Comic Sans — arrondie, très différente',
    shortLabel: 'Comic',
    className: 'rte-font-comic',
    fontFamily: '"Comic Sans MS", "Comic Sans", cursive',
  },
] as const;

const ALLOWED_FONT_FAMILY_NORMALIZED = new Set(
  RICH_TEXT_FONTS.map((f) => normalizeFontFamily(f.fontFamily))
);

export type RichTextFontId = (typeof RICH_TEXT_FONTS)[number]['id'];

export function plainTextLength(html: string | null | undefined): number {
  if (!html) return 0;
  const text = stripHtml(html).replace(/\s+/g, ' ').trim();
  return text.length;
}

export function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  if (typeof document === 'undefined') {
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  const div = document.createElement('div');
  div.innerHTML = html;
  return (div.textContent || div.innerText || '').trim();
}

function normalizeFontFamily(value: string): string {
  return value.replace(/["']/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function isAllowedFontFamily(style: string | null): boolean {
  if (!style) return true;
  const match = style.match(/font-family\s*:\s*([^;]+)/i);
  if (!match) return true;
  const normalized = normalizeFontFamily(match[1]);
  return ALLOWED_FONT_FAMILY_NORMALIZED.has(normalized);
}

function allowedFontClasses(classAttr: string | null): string | null {
  if (!classAttr) return null;
  const kept = classAttr
    .split(/\s+/)
    .filter((c) => c.startsWith(FONT_CLASS_PREFIX) && ALLOWED_FONT_IDS.has(c.slice(FONT_CLASS_PREFIX.length)));
  return kept.length ? kept.join(' ') : null;
}

function sanitizeNode(node: Node, out: Element | DocumentFragment): void {
  if (node.nodeType === Node.TEXT_NODE) {
    if (node.textContent) out.appendChild(document.createTextNode(node.textContent));
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;

  const el = node as HTMLElement;
  const tag = el.tagName.toUpperCase();

  if (!ALLOWED_TAGS.has(tag)) {
    for (const child of Array.from(el.childNodes)) {
      sanitizeNode(child, out);
    }
    return;
  }

  if (tag === 'SPAN') {
    const fontClasses = allowedFontClasses(el.getAttribute('class'));
    const style = el.getAttribute('style');
    if (style && !isAllowedFontFamily(style)) {
      for (const child of Array.from(el.childNodes)) {
        sanitizeNode(child, out);
      }
      return;
    }
    if (!fontClasses && !style) {
      for (const child of Array.from(el.childNodes)) {
        sanitizeNode(child, out);
      }
      return;
    }
    const span = document.createElement('span');
    if (fontClasses) span.setAttribute('class', fontClasses);
    const ff = style?.match(/font-family\s*:\s*([^;]+)/i);
    if (ff) {
      span.style.fontFamily = ff[1].trim();
    }
    for (const child of Array.from(el.childNodes)) {
      sanitizeNode(child, span);
    }
    out.appendChild(span);
    return;
  }

  const clone = document.createElement(tag.toLowerCase());
  for (const child of Array.from(el.childNodes)) {
    sanitizeNode(child, clone);
  }
  out.appendChild(clone);
}

/** Keeps bold, italic, underline and font spans only. */
export function sanitizeRichHtml(html: string | null | undefined): string {
  if (!html) return '';
  const trimmed = html.trim();
  if (!trimmed) return '';

  if (typeof document === 'undefined') {
    return trimmed;
  }

  const container = document.createElement('div');
  container.innerHTML = trimmed;
  const fragment = document.createDocumentFragment();
  for (const child of Array.from(container.childNodes)) {
    sanitizeNode(child, fragment);
  }
  const out = document.createElement('div');
  out.appendChild(fragment);
  let result = out.innerHTML.replace(/<div><br><\/div>/gi, '').trim();
  if (result === '<br>' || result === '<p><br></p>') return '';
  return result;
}

export function isRichHtmlEmpty(html: string | null | undefined): boolean {
  return plainTextLength(html) === 0;
}
