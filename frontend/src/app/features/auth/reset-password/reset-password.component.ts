import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { APP_ROUTES } from '../../../core/constants/routes.constant';
import { passwordStrengthValidator } from '../../../shared/validators/password.validators';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.css',
})
export class ResetPasswordComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
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
      this.authService.setError('Reset token is missing or invalid.');
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { password, confirmPassword } = this.form.getRawValue();

    if (password !== confirmPassword) {
      this.authService.setError('Passwords do not match.');
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
            response.message || 'Password reset successfully. You can now sign in.'
          );
          void this.router.navigate([APP_ROUTES.AUTH.LOGIN]);
        },
        error: (error: HttpErrorResponse) => {
          const message = error.error?.message || 'Unable to reset password.';
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
    return typeof errors['passwordStrength'] === 'string'
      ? errors['passwordStrength']
      : 'Password does not meet security requirements.';
  }
}
