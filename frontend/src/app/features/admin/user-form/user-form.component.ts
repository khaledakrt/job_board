import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AdminService } from '../services/admin.service';
import { APP_ROUTES } from '../../../core/constants/routes.constant';
import { USER_ROLES, UserRole } from '../../../core/constants/roles.constant';
import { InstitutionType } from '../../../core/models/catalog.model';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './user-form.component.html',
  styleUrl: './user-form.component.css',
})
export class UserFormComponent {
  private readonly adminService = inject(AdminService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  readonly routes = APP_ROUTES;
  readonly roles = USER_ROLES;

  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    role: [USER_ROLES.CANDIDATE as UserRole, Validators.required],
    isVerified: [true],
    firstName: [''],
    lastName: [''],
    companyName: [''],
    companyIndustry: [''],
    jobTitle: ['Recruteur'],
    providerName: [''],
    institutionType: ['academy' as InstitutionType],
  });

  submit(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    const v = this.form.getRawValue();
    this.adminService
      .createUser({
        email: v.email,
        password: v.password,
        role: v.role,
        isVerified: v.isVerified,
        firstName: v.firstName || undefined,
        lastName: v.lastName || undefined,
        companyName: v.role === USER_ROLES.RECRUITER ? v.companyName || 'Nouvelle entreprise' : undefined,
        companyIndustry: v.role === USER_ROLES.RECRUITER ? v.companyIndustry || undefined : undefined,
        jobTitle: v.jobTitle || undefined,
        providerName:
          v.role === USER_ROLES.TRAINING_PROVIDER || v.role === USER_ROLES.INSTITUTION_PROVIDER
            ? v.providerName || undefined
            : undefined,
        institutionType:
          v.role === USER_ROLES.INSTITUTION_PROVIDER ? v.institutionType : undefined,
      })
      .subscribe({
        next: (res) => {
          void this.router.navigate([this.routes.ADMIN.USER_DETAIL(res.data!.id)]);
        },
        error: (err: HttpErrorResponse) => {
          this.errorMessage.set(err.error?.message || 'Création impossible');
          this.saving.set(false);
        },
      });
  }
}
