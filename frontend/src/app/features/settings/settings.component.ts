import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import {
  differentFromCurrentEmailValidator,
  emailMatchValidator,
} from '../../shared/validators/email.validators';
import {
  differentFromCurrentPasswordValidator,
  passwordMatchValidator,
  passwordStrengthValidator,
} from '../../shared/validators/password.validators';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css',
})
export class SettingsComponent {
  private readonly fb = inject(FormBuilder);
  readonly authService = inject(AuthService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  readonly passwordSubmitted = signal(false);
  readonly emailSubmitted = signal(false);
  readonly passwordSuccessMessage = signal<string | null>(null);
  readonly emailSuccessMessage = signal<string | null>(null);
  readonly emailDevVerifyUrl = signal<string | null>(null);
  readonly emailErrorMessage = signal<string | null>(null);

  readonly passwordForm = this.fb.group(
    {
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, passwordStrengthValidator()]],
      confirmPassword: ['', [Validators.required]],
    },
    {
      validators: [
        passwordMatchValidator('newPassword', 'confirmPassword'),
        differentFromCurrentPasswordValidator('currentPassword', 'newPassword'),
      ],
    }
  );

  readonly emailForm = this.fb.group(
    {
      newEmail: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
      confirmNewEmail: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
      currentPassword: ['', [Validators.required]],
    },
    {
      validators: [
        emailMatchValidator('newEmail', 'confirmNewEmail'),
        differentFromCurrentEmailValidator(
          this.authService.user()?.email ?? '',
          'newEmail'
        ),
      ],
    }
  );

  readonly userEmail = this.authService.user()?.email ?? '';
  readonly isCandidate = this.authService.isCandidate;

  async onSubmitPassword(): Promise<void> {
    this.passwordSubmitted.set(true);
    this.authService.clearError();
    this.passwordSuccessMessage.set(null);

    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    const ok = await this.confirmDialog.confirm({
      title: 'Modifier le mot de passe',
      message: 'Confirmer le changement de mot de passe ? Vous devrez vous reconnecter.',
      confirmLabel: 'Confirmer',
    });
    if (!ok) return;

    const { currentPassword, newPassword } = this.passwordForm.getRawValue();

    this.authService
      .changePassword({
        currentPassword: currentPassword!,
        newPassword: newPassword!,
      })
      .subscribe({
        next: (response) => {
          this.passwordSuccessMessage.set(
            response.message || 'Mot de passe modifié. Reconnectez-vous.'
          );
        },
        error: (error: HttpErrorResponse) => {
          const message = error.error?.message || 'Impossible de modifier le mot de passe.';
          this.authService.setError(message);
        },
      });
  }

  async onSubmitEmail(): Promise<void> {
    this.emailSubmitted.set(true);
    this.emailErrorMessage.set(null);
    this.emailSuccessMessage.set(null);
    this.emailDevVerifyUrl.set(null);

    if (this.emailForm.invalid) {
      this.emailForm.markAllAsTouched();
      return;
    }

    const { newEmail, confirmNewEmail, currentPassword } = this.emailForm.getRawValue();
    const normalizedNew = newEmail!.trim().toLowerCase();

    const ok = await this.confirmDialog.confirm({
      title: 'Modifier l’adresse e-mail',
      message: `Confirmer le changement vers ${normalizedNew} ? Un e-mail de confirmation sera envoyé à cette adresse.`,
      confirmLabel: 'Confirmer',
    });
    if (!ok) return;

    this.authService
      .changeEmail({
        newEmail: normalizedNew,
        confirmNewEmail: confirmNewEmail!.trim().toLowerCase(),
        currentPassword: currentPassword!,
      })
      .subscribe({
        next: (response) => {
          this.emailSuccessMessage.set(
            response.message ||
              'E-mail modifié. Ouvrez le lien de confirmation envoyé à votre nouvelle adresse avant de vous reconnecter.'
          );
          const devUrl = response.data?.devVerifyUrl;
          if (devUrl) {
            this.emailDevVerifyUrl.set(devUrl);
          }
        },
        error: (error: HttpErrorResponse) => {
          const msg = error.error?.message;
          if (error.status === 409) {
            this.emailErrorMessage.set(
              msg ||
                'Cette adresse e-mail est déjà utilisée par un autre compte (ex. compte recruteur ou candidat existant).'
            );
          } else if (error.status === 401) {
            this.emailErrorMessage.set(msg || 'Mot de passe actuel incorrect.');
          } else {
            this.emailErrorMessage.set(
              msg || 'Impossible de modifier l’adresse e-mail.'
            );
          }
        },
      });
  }

  hasPasswordError(controlName: 'currentPassword' | 'newPassword' | 'confirmPassword'): boolean {
    const control = this.passwordForm.get(controlName);
    return !!control && control.invalid && (control.touched || this.passwordSubmitted());
  }

  hasPasswordFormError(errorKey: string): boolean {
    return !!this.passwordForm.errors?.[errorKey] && this.passwordSubmitted();
  }

  hasEmailError(controlName: 'newEmail' | 'confirmNewEmail' | 'currentPassword'): boolean {
    const control = this.emailForm.get(controlName);
    return !!control && control.invalid && (control.touched || this.emailSubmitted());
  }

  hasEmailFormError(errorKey: string): boolean {
    return !!this.emailForm.errors?.[errorKey] && this.emailSubmitted();
  }

  newPasswordErrorMessage(): string | null {
    const control = this.passwordForm.get('newPassword');
    const errors = control?.errors;

    if (!errors?.['passwordStrength']) {
      return null;
    }

    return typeof errors['passwordStrength'] === 'string'
      ? errors['passwordStrength']
      : 'Le mot de passe ne respecte pas les critères de sécurité.';
  }
}
