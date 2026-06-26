import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { APP_ROUTES } from '../../../core/constants/routes.constant';
import { RecruiterContextService } from '../services/recruiter-context.service';
import { RecruiterNotificationBellComponent } from '../shared/notification-bell/notification-bell.component';
import type { RecruiterProfile } from '../../../core/models/recruiter.model';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { LanguageSwitcherComponent } from '../../../shared/components/language-switcher/language-switcher.component';
import { I18nService } from '../../../core/i18n/i18n.service';

type PublicationAccess = NonNullable<RecruiterProfile['publicationAccess']>;

@Component({
  selector: 'app-recruiter-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    RecruiterNotificationBellComponent,
    TranslatePipe,
    LanguageSwitcherComponent,
  ],
  templateUrl: './recruiter-layout.component.html',
  styleUrl: './recruiter-layout.component.css',
})
export class RecruiterLayoutComponent implements OnInit, OnDestroy {
  readonly authService = inject(AuthService);
  readonly context = inject(RecruiterContextService);
  readonly routes = APP_ROUTES;
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);
  private refreshIntervalId: ReturnType<typeof window.setInterval> | null = null;
  private readonly handleWindowFocus = () => this.refreshContext(false);

  ngOnInit(): void {
    this.refreshContext(true);

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', this.handleWindowFocus);
      this.refreshIntervalId = window.setInterval(() => this.refreshContext(false), 60000);
    }
  }

  ngOnDestroy(): void {
    if (typeof window === 'undefined') return;

    window.removeEventListener('focus', this.handleWindowFocus);
    if (this.refreshIntervalId) {
      window.clearInterval(this.refreshIntervalId);
      this.refreshIntervalId = null;
    }
  }

  retryContextLoad(): void {
    this.refreshContext(false);
  }

  private refreshContext(redirectIfMissing: boolean): void {
    if (this.context.loading()) return;
    this.context.loadContext().subscribe({
      next: (response) => {
        if ('failed' in response && response.failed) {
          return;
        }
        if (redirectIfMissing && !response.data && !this.isOnboardingRoute()) {
          this.authService.logout(false);
          void this.router.navigate([APP_ROUTES.HOME]);
        }
      },
      error: () => undefined,
    });
  }

  isOnboardingRoute(): boolean {
    return this.router.url.startsWith(APP_ROUTES.RECRUITER.ONBOARDING);
  }

  publicationStatusLabelKey(access: PublicationAccess): string {
    if (!access.canPublish) return 'recruiter.publication.paymentRequired';
    if (access.reason === 'free_global') return 'recruiter.publication.freeGlobal';
    return 'recruiter.publication.activeSubscription';
  }

  publicationStatusTitle(access: PublicationAccess): string {
    if (access.reason === 'free_global') {
      return this.i18n.translate('recruiter.publication.freeGlobalTitle');
    }
    if (access.reason === 'company_subscription_active') {
      return this.i18n.translate('recruiter.publication.activeSubscriptionTitle');
    }
    return this.i18n.translate('recruiter.publication.paymentRequiredTitle');
  }

  logout(): void {
    this.authService.logout();
  }
}
