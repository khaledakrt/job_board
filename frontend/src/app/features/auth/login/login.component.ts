import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { APP_ROUTES } from '../../../core/constants/routes.constant';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  readonly authService = inject(AuthService);

  readonly routes = APP_ROUTES;
  readonly submitted = signal(false);
  readonly showResendVerification = signal(false);
  readonly resendSuccess = signal<string | null>(null);
  readonly resendDevVerifyUrl = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(1)]],
  });

  resendVerificationEmail(): void {
    const email = this.form.controls.email.value?.trim();
    if (!email) {
      this.authService.setError('Saisissez votre adresse e-mail pour renvoyer la confirmation.');
      return;
    }
    this.resendSuccess.set(null);
    this.resendDevVerifyUrl.set(null);
    this.authService.resendVerification(email).subscribe({
      next: (res) => {
        this.resendSuccess.set(
          res.message ||
            'Si un compte existe, un e-mail de confirmation a été envoyé. Vérifiez aussi les spams.'
        );
        this.resendDevVerifyUrl.set(res.data?.devVerifyUrl ?? null);
        this.authService.clearError();
      },
      error: (err: HttpErrorResponse) => {
        this.authService.setError(
          err.error?.message || 'Impossible d\'envoyer l\'e-mail de confirmation.'
        );
      },
    });
  }

  onSubmit(): void {
    this.submitted.set(true);
    this.authService.clearError();
    this.resendSuccess.set(null);
    this.resendDevVerifyUrl.set(null);
    this.showResendVerification.set(false);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.authService.login(this.form.getRawValue()).subscribe({
      error: (error: HttpErrorResponse) => {
        let message = error.error?.message || 'Échec de connexion. Vérifiez vos identifiants.';
        if (error.status === 429) {
          message =
            error.error?.message ||
            'Trop de tentatives. Attendez 1 à 15 minutes, puis réessayez.';
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
