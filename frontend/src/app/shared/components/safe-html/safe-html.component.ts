import { Component, computed, inject, input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { sanitizeRichHtml } from '../../utils/rich-text.util';

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
}
