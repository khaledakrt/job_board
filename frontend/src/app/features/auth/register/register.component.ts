import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { APP_ROUTES } from '../../../core/constants/routes.constant';
import { RegisterRole } from '../../../core/constants/roles.constant';
import { passwordStrengthValidator } from '../../../shared/validators/password.validators';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
})
export class RegisterComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly authService = inject(AuthService);

  readonly routes = APP_ROUTES;
  readonly submitted = signal(false);
  readonly successMessage = signal<string | null>(null);
  readonly selectedRole = signal<RegisterRole>('candidate');

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, passwordStrengthValidator()]],
    confirmPassword: ['', [Validators.required]],
  });

  ngOnInit(): void {
    const role = this.route.snapshot.queryParamMap.get('role');
    if (role === 'candidate' || role === 'recruiter') {
      this.selectedRole.set(role);
    }
  }

  selectRole(role: RegisterRole): void {
    this.selectedRole.set(role);
  }

  onSubmit(): void {
    this.submitted.set(true);
    this.authService.clearError();
    this.successMessage.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password, confirmPassword } = this.form.getRawValue();

    if (password !== confirmPassword) {
      this.authService.setError('Passwords do not match.');
      return;
    }

    this.authService
      .register({
        email,
        password,
        role: this.selectedRole(),
      })
      .subscribe({
        next: (response) => {
          this.successMessage.set(
            response.message ||
              'Registration successful. Please verify your email before signing in.'
          );
          void this.router.navigate([APP_ROUTES.AUTH.LOGIN]);
        },
        error: (error: HttpErrorResponse) => {
          const message = error.error?.message || 'Registration failed. Please try again.';
          this.authService.setError(message);
        },
      });
  }

  hasError(controlName: 'email' | 'password' | 'confirmPassword'): boolean {
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
