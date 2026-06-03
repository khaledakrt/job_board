import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function emailMatchValidator(
  emailControlName: string,
  confirmControlName: string
): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const email = group.get(emailControlName)?.value?.trim()?.toLowerCase();
    const confirm = group.get(confirmControlName)?.value?.trim()?.toLowerCase();
    if (!email || !confirm) return null;
    return email === confirm ? null : { emailMismatch: true };
  };
}

export function differentFromCurrentEmailValidator(
  currentEmail: string,
  newEmailControlName: string
): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const newEmail = group.get(newEmailControlName)?.value?.trim()?.toLowerCase();
    if (!newEmail) return null;
    return newEmail === currentEmail.trim().toLowerCase()
      ? { sameAsCurrentEmail: true }
      : null;
  };
}
