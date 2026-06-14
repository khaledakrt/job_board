import { Component, inject } from '@angular/core';
import { AppLanguage } from '../../../core/i18n/translations';
import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  template: `
    <div class="language-switcher" role="group" aria-label="Language">
      <button
        type="button"
        class="language-switcher-btn"
        [class.language-switcher-btn-active]="i18n.language() === 'fr'"
        (click)="setLanguage('fr')"
      >
        FR
      </button>
      <button
        type="button"
        class="language-switcher-btn"
        [class.language-switcher-btn-active]="i18n.language() === 'en'"
        (click)="setLanguage('en')"
      >
        EN
      </button>
    </div>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        flex-shrink: 0;
      }

      .language-switcher {
        display: inline-flex;
        align-items: center;
        gap: 0.15rem;
        padding: 0.15rem;
        border: 1px solid rgba(148, 163, 184, 0.45);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.78);
      }

      .language-switcher-btn {
        min-width: 2rem;
        padding: 0.25rem 0.45rem;
        border: 0;
        border-radius: 999px;
        background: transparent;
        color: #64748b;
        cursor: pointer;
        font: inherit;
        font-size: 0.72rem;
        font-weight: 800;
        line-height: 1.2;
      }

      .language-switcher-btn:hover {
        color: #0a66c2;
      }

      .language-switcher-btn-active {
        background: #0a66c2;
        color: #ffffff;
      }

      .language-switcher-btn-active:hover {
        color: #ffffff;
      }
    `,
  ],
})
export class LanguageSwitcherComponent {
  readonly i18n = inject(I18nService);

  setLanguage(language: AppLanguage): void {
    this.i18n.setLanguage(language);
  }
}
