import { Component, inject, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { APP_ROUTES } from '../../../core/constants/routes.constant';
import { ProviderContextService } from '../services/provider-context.service';
import { USER_ROLES } from '../../../core/constants/roles.constant';

@Component({
  selector: 'app-provider-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './provider-layout.component.html',
  styleUrls: ['./provider-layout.component.css', '../shared/provider-theme.css'],
  host: { class: 'provider-layout-host' },
})
export class ProviderLayoutComponent implements OnInit {
  readonly authService = inject(AuthService);
  readonly ctx = inject(ProviderContextService);
  readonly routes = APP_ROUTES;

  get isTraining(): boolean {
    return this.authService.user()?.role === USER_ROLES.TRAINING_PROVIDER;
  }

  get basePath(): string {
    return this.isTraining ? '/provider/centre' : '/provider/etablissement';
  }

  ngOnInit(): void {
    this.ctx.load();
  }

  logout(): void {
    this.authService.logout();
  }

  publicPageLink(): string[] {
    const org = this.ctx.dashboard()?.organization;
    if (!org?.id) return ['/'];
    return this.isTraining
      ? ['/centres-formation', org.id]
      : ['/etablissements-prives', org.id];
  }
}
