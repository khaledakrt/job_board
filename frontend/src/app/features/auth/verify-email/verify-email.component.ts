import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { APP_ROUTES } from '../../../core/constants/routes.constant';
import { PublicShellComponent } from '../../public/shared/public-shell.component';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [RouterLink, PublicShellComponent, TranslatePipe],
  templateUrl: './verify-email.component.html',
  styleUrl: './verify-email.component.css',
})
export class VerifyEmailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly i18n = inject(I18nService);
  readonly authService = inject(AuthService);

  readonly routes = APP_ROUTES;
  readonly loading = signal(true);
  readonly successMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly verifiedEmail = signal<string | null>(null);

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token')?.trim() || '';

    if (!token) {
      this.loading.set(false);
      this.errorMessage.set(this.i18n.translate('auth.verify.missingLink'));
      return;
    }

    this.authService.verifyEmail(token).subscribe({
      next: (res) => {
        this.successMessage.set(
          res.message || this.i18n.translate('auth.verify.success')
        );
        if (res.data?.email) {
          this.verifiedEmail.set(res.data.email);
        }
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(
          err.error?.message || this.i18n.translate('auth.verify.invalidLink')
        );
        this.loading.set(false);
      },
    });
  }
}
