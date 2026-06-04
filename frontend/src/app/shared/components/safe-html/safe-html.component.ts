import { Component, computed, HostListener, inject, input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { sanitizeRichHtml } from '../../utils/rich-text.util';

const SAFE_LINK_RE = /^(https?:|mailto:)/i;

@Component({
  selector: 'app-safe-html',
  standalone: true,
  template: `<div class="safe-html" [innerHTML]="safeHtml()"></div>`,
  styleUrl: './safe-html.component.css',
})
export class SafeHtmlComponent {
  readonly content = input.required<string>();

  private readonly sanitizer = inject(DomSanitizer);

  readonly safeHtml = computed(() => {
    const cleaned = sanitizeRichHtml(this.content());
    return this.sanitizer.bypassSecurityTrustHtml(cleaned || '');
  });

  /** Liens insérés via innerHTML : ouverture fiable (panneau liste, popup cartes). */
  @HostListener('click', ['$event'])
  onRichTextClick(event: MouseEvent): void {
    if (event.button !== 0 || event.defaultPrevented) return;
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;

    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const anchor = target.closest('a[href]');
    if (!(anchor instanceof HTMLAnchorElement)) return;

    const href = anchor.getAttribute('href')?.trim();
    if (!href || !SAFE_LINK_RE.test(href)) return;

    event.preventDefault();
    event.stopPropagation();
    window.open(href, '_blank', 'noopener,noreferrer');
  }
}
