import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { APP_ROUTES } from '../../../core/constants/routes.constant';
import { RecruiterContextService } from '../services/recruiter-context.service';
import { RecruiterNotificationBellComponent } from '../shared/notification-bell/notification-bell.component';

@Component({
  selector: 'app-recruiter-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, RecruiterNotificationBellComponent],
  templateUrl: './recruiter-layout.component.html',
  styleUrl: './recruiter-layout.component.css',
})
export class RecruiterLayoutComponent implements OnInit {
  readonly authService = inject(AuthService);
  readonly context = inject(RecruiterContextService);
  readonly routes = APP_ROUTES;
  private readonly router = inject(Router);

  ngOnInit(): void {
    if (this.context.profile() || this.context.checked()) return;

    this.context.loadContext().subscribe({
      next: (response) => {
        if (!response.data && !this.isOnboardingRoute()) {
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

  logout(): void {
    this.authService.logout();
  }
}
