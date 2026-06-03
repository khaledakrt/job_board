import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const PASSWORD_PATTERN =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()[\]\-_=+{}|;:'",.<>/\\`~]).+$/;

export function passwordStrengthValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value as string;

    if (!value) {
      return null;
    }

    if (value.length < 8) {
      return { passwordStrength: 'Password must be at least 8 characters' };
    }

    if (value.length > 128) {
      return { passwordStrength: 'Password must not exceed 128 characters' };
    }

    if (!PASSWORD_PATTERN.test(value)) {
      return {
        passwordStrength:
          'Password must include uppercase, lowercase, number, and special character',
      };
    }

    return null;
  };
}

export function passwordMatchValidator(
  passwordField = 'newPassword',
  confirmField = 'confirmPassword'
): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const password = group.get(passwordField)?.value;
    const confirm = group.get(confirmField)?.value;

    if (!password || !confirm) {
      return null;
    }

    return password === confirm ? null : { passwordMismatch: true };
  };
}

export function differentFromCurrentPasswordValidator(
  currentField = 'currentPassword',
  newField = 'newPassword'
): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const current = group.get(currentField)?.value;
    const next = group.get(newField)?.value;

    if (!current || !next) {
      return null;
    }

    return current === next ? { sameAsCurrent: true } : null;
  };
}
