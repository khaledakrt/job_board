import {
  AfterViewInit,
  Component,
  computed,
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
  @ViewChild('linkUrlField') private linkUrlFieldRef?: ElementRef<HTMLInputElement>;

  readonly disabled = signal(false);
  /** Police surlignée dans la barre (uniquement si sélection dans cet éditeur). */
  readonly activeFontId = signal<RichTextFontId | null>(null);
  readonly boldActive = signal(false);
  readonly italicActive = signal(false);
  readonly underlineActive = signal(false);
  readonly fontHint = signal<string | null>(null);
  readonly linkEditorOpen = signal(false);
  readonly linkUrlInput = signal('');
  readonly canRemoveLink = signal(false);
  /** Rappel du texte qui recevra le lien (surlignage jaune dans l’éditeur). */
  readonly linkSelectionPreview = signal<string | null>(null);

  readonly linkInputId = computed(() => {
    const id = this.editorId();
    return id ? `${id}-link-url` : 'rte-link-url';
  });

  private pendingHtml: string | null = null;
  private savedRange: Range | null = null;
  private pendingLinkMarker: HTMLSpanElement | null = null;
  /** Lien en cours d’édition (conservé même si le focus est dans le champ URL). */
  private editingLinkAnchor: HTMLAnchorElement | null = null;
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
      const next = sanitizeRichHtml(html);
      if (next === this.currentSanitizedHtml()) {
        return;
      }
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

  onEditorBlur(event: FocusEvent): void {
    const rteRoot = this.editorRef?.nativeElement.closest('.rte');
    const related = event.relatedTarget;

    if (related instanceof Node && rteRoot?.contains(related)) {
      this.onTouched();
      if (this.linkEditorOpen()) {
        return;
      }
      this.normalizeEditor();
      this.emitValue();
      return;
    }

    queueMicrotask(() => {
      const active = document.activeElement;
      if (rteRoot?.contains(active)) {
        return;
      }
      if (this.linkEditorOpen()) {
        this.closeLinkEditor();
      }
      this.resetToolbarState();
    });
    this.onTouched();
    if (!this.linkEditorOpen()) {
      this.normalizeEditor();
    }
    this.emitValue();
  }

  onEditorSelectionChange(): void {
    this.saveSelection();
    this.refreshToolbarState();
  }

  onEditorFocus(): void {
    this.refreshToolbarState();
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const text = event.clipboardData?.getData('text/plain') ?? '';
    document.execCommand('insertText', false, text);
    this.emitValue();
  }

  /** Garde la sélection avant le clic sur 🔗 (sinon elle est perdue). */
  onLinkButtonMouseDown(event: MouseEvent): void {
    event.preventDefault();
    this.captureSelectionForLink();
  }

  openLinkEditor(): void {
    if (this.disabled()) return;
    this.captureSelectionForLink();

    const anchor = this.findAnchorInEditor();
    if (anchor) {
      this.editingLinkAnchor = anchor;
      const anchorRange = document.createRange();
      anchorRange.selectNodeContents(anchor);
      this.savedRange = anchorRange.cloneRange();
      this.clearPendingLinkHighlight();
      this.linkUrlInput.set(anchor.getAttribute('href') ?? '');
      this.canRemoveLink.set(true);
      this.linkSelectionPreview.set('Modification du lien existant');
    } else {
      this.editingLinkAnchor = null;
      const range = this.getSavedOrLiveRange();
      if (!range || range.collapsed) {
        this.fontHint.set('Sélectionnez du texte, puis cliquez sur le bouton lien.');
        this.linkEditorOpen.set(false);
        return;
      }
      this.updateLinkSelectionPreview();
      this.linkUrlInput.set('');
      this.canRemoveLink.set(false);
    }

    this.fontHint.set(null);
    this.linkEditorOpen.set(true);
    setTimeout(() => this.syncLinkUrlFieldDom(), 0);
  }

  onLinkInputPaste(event: ClipboardEvent): void {
    event.stopPropagation();
  }

  private syncLinkUrlFieldDom(): void {
    const el = this.linkUrlFieldRef?.nativeElement;
    if (!el) return;
    el.value = this.linkUrlInput();
    el.focus();
  }

  closeLinkEditor(): void {
    this.clearPendingLinkHighlight();
    this.editingLinkAnchor = null;
    this.linkSelectionPreview.set(null);
    this.linkEditorOpen.set(false);
    this.linkUrlInput.set('');
    this.canRemoveLink.set(false);
  }

  applyLink(): void {
    if (this.disabled()) return;
    const raw =
      this.linkUrlFieldRef?.nativeElement.value ?? this.linkUrlInput();
    this.linkUrlInput.set(raw);
    const url = normalizeLinkUrl(raw);
    if (!url) {
      this.fontHint.set(
        'URL invalide. Ex. : https://www.linkedin.com/company/votre-page ou www.linkedin.com/…'
      );
      return;
    }

    const editor = this.editorRef?.nativeElement;
    if (!editor) return;

    const existing = this.resolveEditingAnchor();
    if (existing) {
      existing.setAttribute('href', url);
      this.applyAnchorAttrs(existing);
      this.closeLinkEditor();
      editor.focus();
      this.emitValue(true);
      return;
    }

    if (this.createLinkFromPendingMarker(url) || this.insertLinkFromSavedRange(url)) {
      this.closeLinkEditor();
      editor.focus();
      this.emitValue(true);
      return;
    }

    editor.focus();
    if (!this.restoreSelectionForLink()) {
      this.fontHint.set('Sélectionnez du texte dans la zone, puis réessayez.');
      return;
    }

    const sel = window.getSelection();
    if (!sel?.rangeCount || sel.getRangeAt(0).collapsed) {
      this.fontHint.set('Sélectionnez du texte à transformer en lien.');
      return;
    }

    const created = document.execCommand('createLink', false, url);
    if (created) {
      this.clearPendingLinkHighlight();
      this.normalizeAnchorsInEditor();
      this.closeLinkEditor();
      this.emitValue(true);
      return;
    }

    const range = sel.getRangeAt(0);
    const anchor = document.createElement('a');
    anchor.setAttribute('href', url);
    this.applyAnchorAttrs(anchor);
    try {
      const fragment = range.extractContents();
      anchor.appendChild(fragment);
      range.insertNode(anchor);
      this.clearPendingLinkHighlight();
    } catch {
      this.fontHint.set('Impossible d’ajouter le lien sur cette sélection.');
      return;
    }

    this.closeLinkEditor();
    this.emitValue(true);
  }

  removeLink(): void {
    if (this.disabled()) return;
    const editor = this.editorRef?.nativeElement;
    if (!editor) return;

    const anchor = this.resolveEditingAnchor();
    if (!anchor?.parentNode) {
      this.fontHint.set('Placez le curseur sur le lien, puis rouvrez le bouton 🔗.');
      return;
    }

    this.unwrapAnchor(anchor);
    this.editingLinkAnchor = null;
    this.closeLinkEditor();
    editor.focus();
    this.emitValue(true);
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
    this.refreshToolbarState();
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

    this.activeFontId.set(fontId);

    const selection = window.getSelection();
    selection?.removeAllRanges();
    const newRange = document.createRange();
    newRange.selectNodeContents(span);
    selection?.addRange(newRange);
    this.savedRange = newRange.cloneRange();
    this.refreshToolbarState();
    this.emitValue();
  }

  private resetToolbarState(): void {
    this.boldActive.set(false);
    this.italicActive.set(false);
    this.underlineActive.set(false);
    this.activeFontId.set(null);
  }

  private refreshToolbarState(): void {
    if (!this.isSelectionInThisEditor()) {
      this.resetToolbarState();
      return;
    }

    this.boldActive.set(this.hasFormatInSelection('bold'));
    this.italicActive.set(this.hasFormatInSelection('italic'));
    this.underlineActive.set(this.hasFormatInSelection('underline'));
    this.activeFontId.set(this.detectFontFromSelection());
  }

  /** Vrai seulement si la sélection / le focus est dans cet éditeur (pas l’autre De./Pf.). */
  private isSelectionInThisEditor(): boolean {
    const editor = this.editorRef?.nativeElement;
    if (!editor) return false;

    if (document.activeElement === editor) {
      return true;
    }

    const sel = window.getSelection();
    if (sel?.rangeCount) {
      const range = sel.getRangeAt(0);
      if (editor.contains(range.commonAncestorContainer)) {
        return true;
      }
    }

    if (this.savedRange && editor.contains(this.savedRange.commonAncestorContainer)) {
      return true;
    }

    const rteRoot = editor.closest('.rte');
    if (rteRoot?.contains(document.activeElement)) {
      return true;
    }

    return false;
  }

  private hasFormatInSelection(command: 'bold' | 'italic' | 'underline'): boolean {
    if (!this.isSelectionInThisEditor()) {
      return false;
    }

    const tags =
      command === 'bold'
        ? ['B', 'STRONG']
        : command === 'italic'
          ? ['I', 'EM']
          : ['U'];

    const node = this.getSelectionStartElement();
    if (!node) {
      try {
        return document.queryCommandState(command);
      } catch {
        return false;
      }
    }

    const editor = this.editorRef!.nativeElement;
    let el: HTMLElement | null = node;
    while (el && el !== editor) {
      if (tags.includes(el.tagName)) {
        return true;
      }
      el = el.parentElement;
    }

    try {
      return document.queryCommandState(command);
    } catch {
      return false;
    }
  }

  private getSelectionStartElement(): HTMLElement | null {
    const sel = window.getSelection();
    if (!sel?.rangeCount) {
      if (!this.savedRange) return null;
      let node: Node = this.savedRange.startContainer;
      if (node.nodeType === Node.TEXT_NODE) {
        node = node.parentNode!;
      }
      return node instanceof HTMLElement ? node : null;
    }

    let node: Node = sel.getRangeAt(0).startContainer;
    if (node.nodeType === Node.TEXT_NODE) {
      node = node.parentNode!;
    }
    return node instanceof HTMLElement ? node : null;
  }

  private detectFontFromSelection(): RichTextFontId | null {
    const editor = this.editorRef?.nativeElement;
    const node = this.getSelectionStartElement();
    if (!editor || !node) {
      return null;
    }

    let el: HTMLElement | null = node;
    while (el && el !== editor) {
      for (const font of this.fonts) {
        if (el.classList.contains(font.className)) {
          return font.id;
        }
      }
      el = el.parentElement;
    }

    return null;
  }

  private captureSelectionForLink(): void {
    const editor = this.editorRef?.nativeElement;
    if (!editor) return;

    const sel = window.getSelection();
    if (sel?.rangeCount) {
      const range = sel.getRangeAt(0);
      if (editor.contains(range.commonAncestorContainer)) {
        this.savedRange = range.cloneRange();
      }
    }
  }

  private getSavedOrLiveRange(): Range | null {
    const editor = this.editorRef?.nativeElement;
    if (!editor) return null;

    const sel = window.getSelection();
    if (sel?.rangeCount) {
      const live = sel.getRangeAt(0);
      if (!live.collapsed && editor.contains(live.commonAncestorContainer)) {
        return live;
      }
    }

    if (this.savedRange && editor.contains(this.savedRange.commonAncestorContainer)) {
      return this.savedRange;
    }

    if (sel?.rangeCount) {
      const live = sel.getRangeAt(0);
      if (editor.contains(live.commonAncestorContainer)) {
        return live;
      }
    }

    return null;
  }

  private applyPendingLinkHighlight(): void {
    this.clearPendingLinkHighlight();
    if (!this.savedRange || this.savedRange.collapsed) return;

    const editor = this.editorRef?.nativeElement;
    if (!editor?.contains(this.savedRange.commonAncestorContainer)) return;

    try {
      const marker = document.createElement('span');
      marker.className = 'rte-link-pending';
      marker.setAttribute('data-rte-link-pending', '1');
      const contents = this.savedRange.extractContents();
      marker.appendChild(contents);
      this.savedRange.insertNode(marker);
      this.pendingLinkMarker = marker;

      const markerRange = document.createRange();
      markerRange.selectNodeContents(marker);
      this.savedRange = markerRange.cloneRange();
    } catch {
      this.pendingLinkMarker = null;
    }
  }

  private clearPendingLinkHighlight(): void {
    const marker = this.pendingLinkMarker;
    if (!marker?.parentNode) {
      this.pendingLinkMarker = null;
      return;
    }
    const parent = marker.parentNode;
    while (marker.firstChild) {
      parent.insertBefore(marker.firstChild, marker);
    }
    parent.removeChild(marker);
    this.pendingLinkMarker = null;
  }

  private insertLinkFromSavedRange(url: string): boolean {
    const editor = this.editorRef?.nativeElement;
    if (!editor || !this.savedRange || this.savedRange.collapsed) return false;
    if (!editor.contains(this.savedRange.commonAncestorContainer)) return false;

    const range = this.savedRange.cloneRange();
    const anchor = document.createElement('a');
    anchor.setAttribute('href', url);
    this.applyAnchorAttrs(anchor);
    try {
      const fragment = range.extractContents();
      anchor.appendChild(fragment);
      range.insertNode(anchor);
      this.pendingLinkMarker = null;
      this.savedRange = null;
      return true;
    } catch {
      return false;
    }
  }

  private createLinkFromPendingMarker(url: string): boolean {
    const marker = this.pendingLinkMarker;
    if (!marker?.parentNode) return false;

    const anchor = document.createElement('a');
    anchor.setAttribute('href', url);
    this.applyAnchorAttrs(anchor);

    const parent = marker.parentNode;
    while (marker.firstChild) {
      anchor.appendChild(marker.firstChild);
    }
    parent.replaceChild(anchor, marker);
    this.pendingLinkMarker = null;
    this.savedRange = null;
    return true;
  }

  private updateLinkSelectionPreview(): void {
    if (!this.savedRange || this.savedRange.collapsed) {
      this.linkSelectionPreview.set(null);
      return;
    }
    const text = this.savedRange.cloneContents().textContent?.replace(/\s+/g, ' ').trim() ?? '';
    if (!text) {
      this.linkSelectionPreview.set('Texte sélectionné');
      return;
    }
    const short = text.length > 48 ? `${text.slice(0, 48)}…` : text;
    this.linkSelectionPreview.set(`Texte sélectionné : « ${short} » — reste surligné en jaune`);
  }

  private restoreSelectionForLink(): boolean {
    const editor = this.editorRef?.nativeElement;
    if (!editor) return false;

    if (this.pendingLinkMarker?.parentNode) {
      const markerRange = document.createRange();
      markerRange.selectNodeContents(this.pendingLinkMarker);
      this.savedRange = markerRange.cloneRange();
    }

    if (!this.savedRange) return false;
    if (!editor.contains(this.savedRange.commonAncestorContainer)) return false;

    const sel = window.getSelection();
    if (!sel) return false;
    sel.removeAllRanges();
    sel.addRange(this.savedRange);
    return true;
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
    return this.restoreSelectionForLink();
  }

  private applyAnchorAttrs(anchor: HTMLAnchorElement): void {
    anchor.setAttribute('href', anchor.getAttribute('href') ?? '');
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
  }

  private normalizeAnchorsInEditor(): void {
    const editor = this.editorRef?.nativeElement;
    if (!editor) return;
    editor.querySelectorAll('a[href]').forEach((node) => {
      if (node instanceof HTMLAnchorElement) {
        const normalized = normalizeLinkUrl(node.getAttribute('href') ?? '');
        if (normalized) {
          node.setAttribute('href', normalized);
          this.applyAnchorAttrs(node);
        }
      }
    });
  }

  private resolveEditingAnchor(): HTMLAnchorElement | null {
    const editor = this.editorRef?.nativeElement;
    const stored = this.editingLinkAnchor;
    if (stored?.parentNode && editor?.contains(stored)) {
      return stored;
    }
    return this.findAnchorInEditor();
  }

  private unwrapAnchor(anchor: HTMLAnchorElement): void {
    const parent = anchor.parentNode;
    if (!parent) return;
    while (anchor.firstChild) {
      parent.insertBefore(anchor.firstChild, anchor);
    }
    parent.removeChild(anchor);
  }

  private findAnchorInEditor(): HTMLAnchorElement | null {
    const editor = this.editorRef?.nativeElement;
    if (!editor) return null;

    const range = this.getSavedOrLiveRange();
    if (!range) return null;

    let node: Node | null = range.commonAncestorContainer;
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

  private focusEditor(): void {
    this.editorRef?.nativeElement.focus();
  }

  private setEditorHtml(html: string): void {
    const el = this.editorRef?.nativeElement;
    if (!el) return;
    const safe = sanitizeRichHtml(html) || '';
    el.innerHTML = safe;
    el.dataset['placeholder'] = safe ? 'false' : 'true';
  }

  private currentSanitizedHtml(): string {
    const el = this.editorRef?.nativeElement;
    return el ? sanitizeRichHtml(el.innerHTML) : '';
  }

  private normalizeEditor(): void {
    const el = this.editorRef?.nativeElement;
    if (!el) return;
    const sanitized = sanitizeRichHtml(el.innerHTML);
    if (sanitized !== el.innerHTML) {
      el.innerHTML = sanitized;
    }
    el.dataset['placeholder'] = sanitized ? 'false' : 'true';
  }

  /**
   * @param syncDom true après ajout/retrait de lien : aligne le DOM sur le HTML sauvegardé.
   * Pendant la frappe (Entrée), syncDom=false pour ne pas sauter le curseur.
   */
  private emitValue(syncDom = false): void {
    const el = this.editorRef?.nativeElement;
    if (!el) return;
    const sanitized = sanitizeRichHtml(el.innerHTML);
    if (syncDom && sanitized !== el.innerHTML) {
      el.innerHTML = sanitized;
    }
    el.dataset['placeholder'] = sanitized ? 'false' : 'true';
    this.onChange(sanitized);
  }
}
