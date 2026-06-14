import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { APP_ROUTES } from '../../../core/constants/routes.constant';
import { passwordStrengthValidator } from '../../../shared/validators/password.validators';
import { PublicShellComponent } from '../../public/shared/public-shell.component';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, PublicShellComponent, TranslatePipe],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.css',
})
export class ResetPasswordComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);
  readonly authService = inject(AuthService);

  readonly routes = APP_ROUTES;
  readonly submitted = signal(false);
  readonly successMessage = signal<string | null>(null);
  readonly resetToken = signal('');

  readonly form = this.fb.nonNullable.group({
    password: ['', [Validators.required, passwordStrengthValidator()]],
    confirmPassword: ['', [Validators.required]],
  });

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token') || '';
    this.resetToken.set(token);
  }

  onSubmit(): void {
    this.submitted.set(true);
    this.authService.clearError();
    this.successMessage.set(null);

    if (!this.resetToken()) {
      this.authService.setError(this.i18n.translate('auth.reset.tokenMissing'));
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { password, confirmPassword } = this.form.getRawValue();

    if (password !== confirmPassword) {
      this.authService.setError(this.i18n.translate('auth.passwordMismatch'));
      return;
    }

    this.authService
      .resetPassword({
        token: this.resetToken(),
        password,
      })
      .subscribe({
        next: (response) => {
          this.successMessage.set(
            response.message || this.i18n.translate('auth.reset.success')
          );
          void this.router.navigate([APP_ROUTES.AUTH.LOGIN]);
        },
        error: (error: HttpErrorResponse) => {
          const message = error.error?.message || this.i18n.translate('auth.reset.failed');
          this.authService.setError(message);
        },
      });
  }

  hasError(controlName: 'password' | 'confirmPassword'): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.touched || this.submitted());
  }

  passwordErrorMessage(): string | null {
    const errors = this.form.controls.password.errors;
    if (!errors?.['passwordStrength']) {
      return null;
    }
    const message = typeof errors['passwordStrength'] === 'string' ? errors['passwordStrength'] : '';
    if (message.includes('at least 8')) return this.i18n.translate('auth.passwordMin');
    if (message.includes('not exceed')) return this.i18n.translate('auth.passwordMax');
    if (message.includes('uppercase')) return this.i18n.translate('auth.passwordStrength');
    return this.i18n.translate('auth.passwordStrength');
  }
}
