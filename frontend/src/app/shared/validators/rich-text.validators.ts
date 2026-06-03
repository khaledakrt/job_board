import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { plainTextLength } from '../utils/rich-text.util';

export function richTextMinLength(min: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const len = plainTextLength(control.value);
    if (len >= min) return null;
    return { richTextMinLength: { requiredLength: min, actualLength: len } };
  };
}

export function richTextRequired(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (plainTextLength(control.value) > 0) return null;
    return { required: true };
  };
}
