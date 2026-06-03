import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { APP_ROUTES } from '../../../core/constants/routes.constant';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.css',
})
export class ForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  readonly authService = inject(AuthService);

  readonly routes = APP_ROUTES;
  readonly submitted = signal(false);
  readonly successMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  onSubmit(): void {
    this.submitted.set(true);
    this.authService.clearError();
    this.successMessage.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.authService.forgotPassword(this.form.getRawValue()).subscribe({
      next: (response) => {
        this.successMessage.set(
          response.message ||
            'If an account with that email exists, a password reset link has been sent.'
        );
        this.form.reset();
        this.submitted.set(false);
      },
      error: (error: HttpErrorResponse) => {
        let message = error.error?.message || 'Impossible de traiter la demande.';
        if (error.status === 429) {
          message =
            error.error?.message ||
            'Trop de requêtes. Réessayez dans quelques minutes.';
        }
        this.authService.setError(message);
      },
    });
  }

  hasError(): boolean {
    const control = this.form.controls.email;
    return control.invalid && (control.touched || this.submitted());
  }
}
