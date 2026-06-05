import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PublicShellComponent } from '../../public/shared/public-shell.component';
import { ProviderService } from '../services/provider.service';
import { APP_ROUTES } from '../../../core/constants/routes.constant';
import { ProviderRegisterType } from '../../../core/constants/roles.constant';

@Component({
  selector: 'app-provider-register',
  standalone: true,
  imports: [PublicShellComponent, RouterLink, FormsModule],
  templateUrl: './provider-register.component.html',
  styleUrl: '../../public/shared/public-catalog.page.css',
})
export class ProviderRegisterComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly providerService = inject(ProviderService);
  private readonly router = inject(Router);

  readonly providerType = signal<ProviderRegisterType>('training_center');

  ngOnInit(): void {
    const t = this.route.snapshot.data['providerType'];
    if (t === 'private_institution' || t === 'training_center') {
      this.providerType.set(t);
    }
  }

  readonly routes = APP_ROUTES;
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);

  organizationName = '';
  email = '';
  password = '';
  city = '';
  phone = '';

  private extractErrorMessage(err: unknown): string {
    const error = err as {
      error?: {
        message?: string;
        errors?: Array<{ field?: string; message?: string }>;
      };
    };
    const details = error.error?.errors
      ?.map((e) => {
        const field = e.field ? `${e.field} : ` : '';
        return `${field}${e.message ?? ''}`.trim();
      })
      .filter(Boolean);
    if (details?.length) {
      return details.join(' | ');
    }
    return error.error?.message ?? 'Inscription impossible.';
  }

  title(): string {
    return this.providerType() === 'training_center'
      ? 'Inscrire votre centre de formation'
      : 'Inscrire votre établissement privé';
  }

  backLink(): string {
    return this.providerType() === 'training_center'
      ? APP_ROUTES.PUBLIC.TRAINING_CENTERS
      : APP_ROUTES.PUBLIC.PRIVATE_INSTITUTIONS;
  }

  submit(): void {
    this.error.set(null);
    this.success.set(null);

    if (this.organizationName.trim().length < 2) {
      this.error.set('Le nom de l’établissement doit contenir au moins 2 caractères.');
      return;
    }
    if (!this.email.trim()) {
      this.error.set('L’e-mail est obligatoire.');
      return;
    }
    if (this.password.length < 8) {
      this.error.set('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    this.submitting.set(true);

    this.providerService
      .register({
        providerType: this.providerType() as ProviderRegisterType,
        email: this.email.trim(),
        password: this.password,
        organizationName: this.organizationName.trim(),
        city: this.city.trim() || undefined,
        phone: this.phone.trim() || undefined,
      })
      .subscribe({
        next: (res) => {
          this.success.set(
            res.message ??
              'Demande envoyée. Après validation par un administrateur, connectez-vous avec votre e-mail et mot de passe.'
          );
          this.submitting.set(false);
        },
        error: (err) => {
          this.error.set(this.extractErrorMessage(err));
          this.submitting.set(false);
        },
      });
  }

  goLogin(): void {
    void this.router.navigate([APP_ROUTES.AUTH.LOGIN]);
  }
}
