import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { APP_ROUTES } from '../../../core/constants/routes.constant';
import { PublicShellComponent } from '../../public/shared/public-shell.component';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, PublicShellComponent, TranslatePipe],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly i18n = inject(I18nService);
  readonly authService = inject(AuthService);

  readonly routes = APP_ROUTES;
  readonly submitted = signal(false);
  readonly showResendVerification = signal(false);
  readonly resendSuccess = signal<string | null>(null);
  readonly resendDevVerifyUrl = signal<string | null>(null);
  readonly sessionNoticeKey = signal<string | null>(this.buildSessionNoticeKey());

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(1)]],
  });

  resendVerificationEmail(): void {
    const email = this.form.controls.email.value?.trim();
    if (!email) {
      this.authService.setError(this.i18n.translate('auth.login.resendEmailRequired'));
      return;
    }
    this.resendSuccess.set(null);
    this.resendDevVerifyUrl.set(null);
    this.authService.resendVerification(email).subscribe({
      next: (res) => {
        this.resendSuccess.set(
          res.message ||
            this.i18n.translate('auth.login.resendSuccess')
        );
        this.resendDevVerifyUrl.set(res.data?.devVerifyUrl ?? null);
        this.authService.clearError();
      },
      error: (err: HttpErrorResponse) => {
        this.authService.setError(
          err.error?.message || this.i18n.translate('auth.login.resendError')
        );
      },
    });
  }

  private buildSessionNoticeKey(): string | null {
    const reason = this.route.snapshot.queryParamMap.get('reason');
    if (reason === 'passwordChanged') {
      return 'auth.login.notice.passwordChanged';
    }
    if (reason === 'emailChanged') {
      return 'auth.login.notice.emailChanged';
    }
    if (reason === 'sessionExpired') {
      return 'auth.login.notice.sessionExpired';
    }
    if (reason === 'accountBanned') {
      return 'auth.login.notice.accountBanned';
    }
    if (reason === 'emailNotVerified') {
      return 'auth.login.notice.emailNotVerified';
    }
    if (reason === 'forbidden') {
      return 'auth.login.notice.forbidden';
    }
    return null;
  }

  onSubmit(): void {
    this.submitted.set(true);
    this.authService.clearError();
    this.sessionNoticeKey.set(null);
    this.resendSuccess.set(null);
    this.resendDevVerifyUrl.set(null);
    this.showResendVerification.set(false);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');

    this.authService.login(this.form.getRawValue(), returnUrl).subscribe({
      error: (error: HttpErrorResponse) => {
        let message = error.error?.message || this.i18n.translate('auth.login.failed');
        if (error.status === 429) {
          message =
            error.error?.message ||
            this.i18n.translate('auth.login.tooManyAttempts');
        } else if (error.status === 403) {
          this.showResendVerification.set(true);
        }
        this.authService.setError(message);
      },
    });
  }

  hasError(controlName: 'email' | 'password'): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.touched || this.submitted());
  }
}
