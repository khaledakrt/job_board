import { Component, inject, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { APP_ROUTES } from '../../../core/constants/routes.constant';
import { resolveUploadUrl } from '../../../core/utils/asset-url.util';
import { CandidateContextService } from '../services/candidate-context.service';
import { CandidateNotificationBellComponent } from '../shared/notification-bell/notification-bell.component';

@Component({
  selector: 'app-candidate-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CandidateNotificationBellComponent],
  templateUrl: './candidate-layout.component.html',
  styleUrl: './candidate-layout.component.css',
})
export class CandidateLayoutComponent implements OnInit {
  readonly authService = inject(AuthService);
  readonly context = inject(CandidateContextService);
  readonly routes = APP_ROUTES;

  ngOnInit(): void {
    this.context.loadProfile().subscribe();
  }

  displayName(): string {
    const p = this.context.profile();
    if (p?.firstName || p?.lastName) {
      return [p.firstName, p.lastName].filter(Boolean).join(' ');
    }
    return this.authService.user()?.email || 'Candidat';
  }

  avatarUrl(): string | null {
    return resolveUploadUrl(this.context.profile()?.avatarUrl ?? null);
  }

  initials(): string {
    const p = this.context.profile();
    const parts = [p?.firstName, p?.lastName].filter(Boolean) as string[];
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
    }
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (this.authService.user()?.email?.charAt(0) || 'C').toUpperCase();
  }

  logout(): void {
    this.authService.logout();
  }
}
