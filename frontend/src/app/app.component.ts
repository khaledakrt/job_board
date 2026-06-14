import { Component, inject, signal } from '@angular/core';
import { NavigationCancel, NavigationEnd, NavigationError, Router, RouterOutlet } from '@angular/router';
import { ConfirmDialogComponent } from './shared/components/confirm-dialog/confirm-dialog.component';
import { GlobalFooterComponent } from './shared/components/global-footer/global-footer.component';
import { AuthService } from './core/services/auth.service';
import { AutoI18nService } from './core/i18n/auto-i18n.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ConfirmDialogComponent, GlobalFooterComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  readonly title = 'JobBoard';
  readonly bootstrapped = signal(false);
  readonly authService = inject(AuthService);
  private readonly autoI18n = inject(AutoI18nService);

  private readonly router = inject(Router);

  constructor() {
    this.router.events.subscribe((event) => {
      if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        this.bootstrapped.set(true);
      }
    });
  }
}
