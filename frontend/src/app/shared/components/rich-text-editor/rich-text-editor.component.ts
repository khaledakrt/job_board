import {
  AfterViewInit,
  Component,
  ElementRef,
  forwardRef,
  input,
  signal,
  ViewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import {
  normalizeLinkUrl,
  RICH_TEXT_FONTS,
  RichTextFontId,
  sanitizeRichHtml,
} from '../../utils/rich-text.util';

@Component({
  selector: 'app-rich-text-editor',
  standalone: true,
  templateUrl: './rich-text-editor.component.html',
  styleUrl: './rich-text-editor.component.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RichTextEditorComponent),
      multi: true,
    },
  ],
})
export class RichTextEditorComponent implements ControlValueAccessor, AfterViewInit {
  readonly editorId = input<string | undefined>(undefined);
  readonly placeholder = input('Saisissez votre texte…');
  readonly fonts = RICH_TEXT_FONTS;

  @ViewChild('editor') private editorRef?: ElementRef<HTMLDivElement>;

  readonly disabled = signal(false);
  readonly selectedFont = signal<RichTextFontId>('arial');
  readonly fontHint = signal<string | null>(null);
  readonly linkEditorOpen = signal(false);
  readonly linkUrlInput = signal('');
  readonly canRemoveLink = signal(false);

  private pendingHtml: string | null = null;
  private savedRange: Range | null = null;
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  ngAfterViewInit(): void {
    if (this.pendingHtml !== null) {
      this.setEditorHtml(this.pendingHtml);
      this.pendingHtml = null;
    }
  }

  writeValue(value: string | null): void {
    const html = value ?? '';
    if (this.editorRef?.nativeElement) {
      this.setEditorHtml(html);
    } else {
      this.pendingHtml = html;
    }
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  onEditorInput(): void {
    this.fontHint.set(null);
    this.emitValue();
  }

  onEditorBlur(): void {
    this.onTouched();
    this.normalizeEditor();
    this.emitValue();
  }

  onEditorSelectionChange(): void {
    this.saveSelection();
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const text = event.clipboardData?.getData('text/plain') ?? '';
    document.execCommand('insertText', false, text);
    this.emitValue();
  }

  openLinkEditor(): void {
    if (this.disabled()) return;
    this.focusEditor();
    this.restoreSelection();

    const anchor = this.findAnchorInSelection();
    if (anchor) {
      this.linkUrlInput.set(anchor.getAttribute('href') ?? '');
      this.canRemoveLink.set(true);
    } else {
      const range = this.resolveActiveRange();
      if (!range) {
        this.fontHint.set('Sélectionnez du texte, puis cliquez sur le bouton lien.');
        this.linkEditorOpen.set(false);
        return;
      }
      this.linkUrlInput.set('');
      this.canRemoveLink.set(false);
    }

    this.fontHint.set(null);
    this.linkEditorOpen.set(true);
  }

  closeLinkEditor(): void {
    this.linkEditorOpen.set(false);
    this.linkUrlInput.set('');
    this.canRemoveLink.set(false);
  }

  applyLink(): void {
    if (this.disabled()) return;
    const url = normalizeLinkUrl(this.linkUrlInput());
    if (!url) {
      this.fontHint.set('Indiquez une URL valide (ex. https://linkedin.com/…).');
      return;
    }

    this.focusEditor();
    this.restoreSelection();

    const existing = this.findAnchorInSelection();
    if (existing) {
      existing.setAttribute('href', url);
      existing.setAttribute('target', '_blank');
      existing.setAttribute('rel', 'noopener noreferrer');
      this.closeLinkEditor();
      this.emitValue();
      return;
    }

    const range = this.resolveActiveRange();
    if (!range || range.collapsed) {
      this.fontHint.set('Sélectionnez du texte à transformer en lien.');
      return;
    }

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    try {
      const fragment = range.extractContents();
      anchor.appendChild(fragment);
      range.insertNode(anchor);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      const newRange = document.createRange();
      newRange.selectNodeContents(anchor);
      selection?.addRange(newRange);
      this.savedRange = newRange.cloneRange();
    } catch {
      this.fontHint.set('Impossible d’ajouter le lien sur cette sélection.');
      return;
    }

    this.closeLinkEditor();
    this.emitValue();
  }

  removeLink(): void {
    if (this.disabled()) return;
    this.focusEditor();
    this.restoreSelection();
    const anchor = this.findAnchorInSelection();
    if (!anchor?.parentNode) {
      this.closeLinkEditor();
      return;
    }
    const parent = anchor.parentNode;
    while (anchor.firstChild) {
      parent.insertBefore(anchor.firstChild, anchor);
    }
    parent.removeChild(anchor);
    this.closeLinkEditor();
    this.emitValue();
  }

  onLinkUrlInput(event: Event): void {
    this.linkUrlInput.set((event.target as HTMLInputElement).value);
  }

  onLinkKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.applyLink();
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeLinkEditor();
    }
  }

  format(command: 'bold' | 'italic' | 'underline'): void {
    if (this.disabled()) return;
    this.focusEditor();
    this.restoreSelection();
    document.execCommand(command, false);
    this.emitValue();
  }

  applyFont(fontId: RichTextFontId): void {
    if (this.disabled()) return;
    const preset = this.fonts.find((f) => f.id === fontId);
    if (!preset) return;

    this.focusEditor();
    const range = this.resolveActiveRange();
    if (!range || range.collapsed) {
      this.fontHint.set('Sélectionnez du texte dans la zone, puis cliquez Arial, Georgia ou Comic.');
      return;
    }

    this.fontHint.set(null);
    const span = document.createElement('span');
    span.className = preset.className;
    span.style.fontFamily = preset.fontFamily;

    try {
      const fragment = range.extractContents();
      span.appendChild(fragment);
      range.insertNode(span);
    } catch {
      this.fontHint.set('Impossible d’appliquer la police sur cette sélection.');
      return;
    }

    this.selectedFont.set(fontId);

    const selection = window.getSelection();
    selection?.removeAllRanges();
    const newRange = document.createRange();
    newRange.selectNodeContents(span);
    selection?.addRange(newRange);
    this.savedRange = newRange.cloneRange();
    this.emitValue();
  }

  isFormatActive(command: 'bold' | 'italic' | 'underline'): boolean {
    try {
      return document.queryCommandState(command);
    } catch {
      return false;
    }
  }

  private saveSelection(): void {
    const editor = this.editorRef?.nativeElement;
    const sel = window.getSelection();
    if (!editor || !sel?.rangeCount) return;

    const range = sel.getRangeAt(0);
    if (range.collapsed) return;
    if (!editor.contains(range.commonAncestorContainer)) return;

    this.savedRange = range.cloneRange();
  }

  private restoreSelection(): boolean {
    if (!this.savedRange) return false;
    const sel = window.getSelection();
    if (!sel) return false;
    sel.removeAllRanges();
    sel.addRange(this.savedRange);
    return true;
  }

  /** Préfère la sélection encore active dans l’éditeur (boutons toolbar), sinon la sauvegarde. */
  private resolveActiveRange(): Range | null {
    const editor = this.editorRef?.nativeElement;
    if (!editor) return null;

    const sel = window.getSelection();
    if (sel?.rangeCount) {
      const live = sel.getRangeAt(0);
      if (!live.collapsed && editor.contains(live.commonAncestorContainer)) {
        return live;
      }
    }

    if (this.savedRange && !this.savedRange.collapsed && editor.contains(this.savedRange.commonAncestorContainer)) {
      sel?.removeAllRanges();
      sel?.addRange(this.savedRange);
      return this.savedRange;
    }

    return null;
  }

  private findAnchorInSelection(): HTMLAnchorElement | null {
    const editor = this.editorRef?.nativeElement;
    if (!editor) return null;

    const sel = window.getSelection();
    if (!sel?.rangeCount) return null;

    let node: Node | null = sel.getRangeAt(0).commonAncestorContainer;
    if (node.nodeType === Node.TEXT_NODE) {
      node = node.parentNode;
    }
    while (node && node !== editor) {
      if (node instanceof HTMLAnchorElement) {
        return node;
      }
      node = node.parentNode;
    }
    return null;
  }

  private focusEditor(): void {
    this.editorRef?.nativeElement.focus();
  }

  private setEditorHtml(html: string): void {
    const el = this.editorRef?.nativeElement;
    if (!el) return;
    el.innerHTML = html || '';
    el.dataset['placeholder'] = html ? 'false' : 'true';
  }

  private normalizeEditor(): void {
    const el = this.editorRef?.nativeElement;
    if (!el) return;
    const sanitized = sanitizeRichHtml(el.innerHTML);
    el.innerHTML = sanitized;
    el.dataset['placeholder'] = sanitized ? 'false' : 'true';
  }

  private emitValue(): void {
    const el = this.editorRef?.nativeElement;
    if (!el) return;
    const sanitized = sanitizeRichHtml(el.innerHTML);
    if (sanitized !== el.innerHTML) {
      el.innerHTML = sanitized;
    }
    el.dataset['placeholder'] = sanitized ? 'false' : 'true';
    this.onChange(sanitized);
  }
}
