import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';
import { AppLanguage, DEFAULT_LANGUAGE, TRANSLATIONS } from './translations';

const STORAGE_KEY = 'jb_lang';

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly document = inject(DOCUMENT);
  private readonly currentLanguage = signal<AppLanguage>(this.readInitialLanguage());

  readonly language = computed(() => this.currentLanguage());

  constructor() {
    this.applyDocumentLanguage(this.currentLanguage());
  }

  setLanguage(language: AppLanguage): void {
    this.currentLanguage.set(language);
    this.applyDocumentLanguage(language);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, language);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('jobboard:languagechange', { detail: { language } }));
    }
  }

  translate(key: string): string {
    const language = this.currentLanguage();
    const current = TRANSLATIONS[language] as Record<string, string>;
    const fallback = TRANSLATIONS[DEFAULT_LANGUAGE] as Record<string, string>;
    return current[key] ?? fallback[key] ?? key;
  }

  private readInitialLanguage(): AppLanguage {
    if (typeof localStorage === 'undefined') return DEFAULT_LANGUAGE;
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'en' || stored === 'fr' ? stored : DEFAULT_LANGUAGE;
  }

  private applyDocumentLanguage(language: AppLanguage): void {
    this.document.documentElement.lang = language;
    this.document.documentElement.dir = 'ltr';
  }
}
