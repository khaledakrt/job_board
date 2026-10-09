const ALLOWED_TAGS = new Set([
  'A',
  'B',
  'STRONG',
  'I',
  'EM',
  'U',
  'SPAN',
  'BR',
  'P',
  'DIV',
]);

const SAFE_LINK_PROTOCOLS = /^(https?:|mailto:)/i;

const FONT_CLASS_PREFIX = 'rte-font-';
const ALLOWED_FONT_IDS = new Set(['arial', 'serif', 'default']);

/** Arial pour le texte courant, Georgia pour un titre ou une citation. */
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

/** Normalise une URL saisie (ajoute https:// si besoin). Retourne null si dangereuse. */
export function normalizeLinkUrl(input: string): string | null {
  let trimmed = input.trim().replace(/\s+/g, '');
  if (!trimmed) return null;
  if (/^javascript:/i.test(trimmed) || /^data:/i.test(trimmed)) return null;
  if (/^mailto:/i.test(trimmed)) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^www\./i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  if (/^[a-z0-9][-a-z0-9.]*\.[a-z]{2,}(\/.*)?$/i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return null;
}

function isSafeHref(href: string | null): boolean {
  if (!href) return false;
  const trimmed = href.trim();
  if (!trimmed || /^javascript:/i.test(trimmed) || /^data:/i.test(trimmed)) {
    return false;
  }
  return SAFE_LINK_PROTOCOLS.test(trimmed);
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

  if (tag === 'A') {
    const href = el.getAttribute('href');
    if (!isSafeHref(href)) {
      for (const child of Array.from(el.childNodes)) {
        sanitizeNode(child, out);
      }
      return;
    }
    const anchor = document.createElement('a');
    anchor.setAttribute('href', href!.trim());
    anchor.setAttribute('target', '_blank');
    anchor.setAttribute('rel', 'noopener noreferrer');
    for (const child of Array.from(el.childNodes)) {
      sanitizeNode(child, anchor);
    }
    out.appendChild(anchor);
    return;
  }

  if (tag === 'SPAN') {
    const fontClasses = allowedFontClasses(el.getAttribute('class'));
    const style = el.getAttribute('style');
    const familyMatch = style?.match(/font-family\s*:\s*([^;]+)/i);
    const familyOk = !familyMatch || isAllowedFontFamily(style);
    if (!fontClasses && !familyOk) {
      for (const child of Array.from(el.childNodes)) {
        sanitizeNode(child, out);
      }
      return;
    }
    if (!fontClasses && !familyMatch) {
      for (const child of Array.from(el.childNodes)) {
        sanitizeNode(child, out);
      }
      return;
    }
    const span = document.createElement('span');
    if (fontClasses) span.setAttribute('class', fontClasses);
    if (familyMatch && familyOk) {
      span.style.fontFamily = familyMatch[1].trim();
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
  let result = out.innerHTML.replace(/<div><br\s*\/?><\/div>/gi, '<br>').trim();
  if (result === '<br>' || result === '<p><br></p>') return '';
  return result;
}

export function isRichHtmlEmpty(html: string | null | undefined): boolean {
  return plainTextLength(html) === 0;
}
