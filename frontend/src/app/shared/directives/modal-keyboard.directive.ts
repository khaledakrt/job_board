import {
  Directive,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  afterNextRender,
  inject,
  Injector,
} from '@angular/core';

@Directive({
  selector: '[appModalKeyboard]',
  standalone: true,
})
export class ModalKeyboardDirective implements OnChanges {
  private readonly injector = inject(Injector);
  private lastFocused: HTMLElement | null = null;

  @Input() appModalKeyboardOpen = false;
  @Input() appModalFocusId?: string;
  @Output() appModalEscape = new EventEmitter<void>();

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['appModalKeyboardOpen']) return;

    if (this.appModalKeyboardOpen) {
      this.lastFocused = document.activeElement as HTMLElement | null;
      if (this.appModalFocusId) {
        afterNextRender(
          () => document.getElementById(this.appModalFocusId!)?.focus(),
          { injector: this.injector }
        );
      }
    } else if (this.lastFocused) {
      this.lastFocused.focus();
      this.lastFocused = null;
    }
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscape(event: KeyboardEvent): void {
    if (!this.appModalKeyboardOpen) return;
    event.preventDefault();
    event.stopPropagation();
    this.appModalEscape.emit();
  }
}
