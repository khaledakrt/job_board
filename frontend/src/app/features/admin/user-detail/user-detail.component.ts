import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AdminService } from '../services/admin.service';
import { AdminUserDetail, LoginEvent } from '../../../core/models/admin.model';
import { InstitutionType } from '../../../core/models/catalog.model';
import { APP_ROUTES } from '../../../core/constants/routes.constant';
import { USER_ROLES, UserRole } from '../../../core/constants/roles.constant';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { AdminPaginationComponent } from '../shared/admin-pagination.component';
import { PaginationMeta } from '../../../core/models/pagination.model';
import { adminPageSummary } from '../shared/admin-pagination.util';
import { resolveUploadUrl } from '../../../core/utils/asset-url.util';

@Component({
  selector: 'app-user-detail',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, DatePipe, AdminPaginationComponent],
  templateUrl: './user-detail.component.html',
  styleUrl: './user-detail.component.css',
})
export class UserDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly adminService = inject(AdminService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly fb = inject(FormBuilder);
  readonly routes = APP_ROUTES;
  readonly roles = USER_ROLES;

  readonly user = signal<AdminUserDetail | null>(null);
  readonly loginEvents = signal<LoginEvent[]>([]);
  readonly loginPagination = signal<PaginationMeta | null>(null);
  readonly loginLoading = signal(false);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly actionLoading = signal<string | null>(null);
  readonly message = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  readonly editForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    role: [USER_ROLES.CANDIDATE as UserRole, Validators.required],
    isVerified: [false],
    firstName: [''],
    lastName: [''],
    professionalTitle: [''],
    phone: [''],
    jobTitle: [''],
    companyName: [''],
    companyIndustry: [''],
    providerName: [''],
    institutionType: ['academy' as InstitutionType],
  });

  readonly passwordForm = this.fb.nonNullable.group({
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  readonly banForm = this.fb.nonNullable.group({
    reason: ['Compte suspect / faux profil'],
  });

  readonly loginSummary = computed(() =>
    adminPageSummary(this.loginPagination(), 'connexion')
  );

  private userId = '';

  ngOnInit(): void {
    this.userId = this.route.snapshot.paramMap.get('id') || '';
    this.loadUser();
    this.loadLoginEvents();
  }

  loadUser(): void {
    this.adminService.getUser(this.userId).subscribe({
      next: (res) => {
        const u = res.data!;
        this.user.set(u);
        this.editForm.patchValue({
          email: u.email,
          role: u.role,
          isVerified: u.isVerified,
          firstName: u.candidateProfile?.firstName || '',
          lastName: u.candidateProfile?.lastName || '',
          professionalTitle: u.candidateProfile?.professionalTitle || '',
          phone: u.candidateProfile?.phone || '',
          jobTitle: u.recruiterProfile?.jobTitle || '',
          companyName: u.recruiterProfile?.companyName || '',
          companyIndustry: '',
          providerName: '',
          institutionType: 'academy' as InstitutionType,
        });
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Utilisateur introuvable');
        this.loading.set(false);
      },
    });
  }

  loadLoginEvents(page = 1): void {
    this.loginLoading.set(true);
    this.adminService.listLoginEvents(this.userId, page).subscribe({
      next: (res) => {
        this.loginEvents.set(res.data || []);
        this.loginPagination.set(res.pagination);
        this.loginLoading.set(false);
      },
      error: () => this.loginLoading.set(false),
    });
  }

  saveProfile(): void {
    if (this.editForm.invalid) return;
    this.saving.set(true);
    this.adminService.updateUser(this.userId, this.editForm.getRawValue()).subscribe({
      next: (res) => {
        this.user.set(res.data!);
        this.message.set('Profil mis à jour');
        this.saving.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(err.error?.message || 'Erreur');
        this.saving.set(false);
      },
    });
  }

  async setPassword(): Promise<void> {
    if (this.passwordForm.invalid) return;
    const ok = await this.confirmDialog.confirm({
      title: 'Réinitialiser le mot de passe ?',
      message: 'Toutes les sessions ouvertes de cet utilisateur seront déconnectées.',
      confirmLabel: 'Réinitialiser',
      confirmDanger: true,
    });
    if (!ok) return;
    const pwd = this.passwordForm.getRawValue().password;
    this.message.set(null);
    this.errorMessage.set(null);
    this.actionLoading.set('password');
    this.adminService.setPassword(this.userId, pwd).subscribe({
      next: () => {
        this.message.set('Mot de passe modifié');
        this.passwordForm.reset();
        this.actionLoading.set(null);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(err.error?.message || 'Erreur mot de passe');
        this.actionLoading.set(null);
      },
    });
  }

  async ban(): Promise<void> {
    const ok = await this.confirmDialog.confirm({
      title: 'Bannir cet utilisateur ?',
      message: 'Il ne pourra plus se connecter.',
      confirmLabel: 'Bannir',
      confirmDanger: true,
    });
    if (!ok) return;
    this.message.set(null);
    this.errorMessage.set(null);
    this.actionLoading.set('ban');
    this.adminService.banUser(this.userId, this.banForm.getRawValue().reason).subscribe({
      next: (res) => {
        this.user.set(res.data!);
        this.message.set('Utilisateur banni');
        this.actionLoading.set(null);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(err.error?.message || 'Erreur');
        this.actionLoading.set(null);
      },
    });
  }

  async unban(): Promise<void> {
    const ok = await this.confirmDialog.confirm({
      title: 'Lever le bannissement ?',
      message: 'L’utilisateur pourra se reconnecter si son compte est vérifié.',
      confirmLabel: 'Lever le bannissement',
    });
    if (!ok) return;
    this.message.set(null);
    this.errorMessage.set(null);
    this.actionLoading.set('unban');
    this.adminService.unbanUser(this.userId).subscribe({
      next: (res) => {
        this.user.set(res.data!);
        this.message.set('Ban levé');
        this.actionLoading.set(null);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(err.error?.message || 'Erreur');
        this.actionLoading.set(null);
      },
    });
  }

  async deleteUser(): Promise<void> {
    const ok = await this.confirmDialog.confirm({
      title: 'Désactiver ce compte ?',
      message: 'Le compte sera banni et ne pourra plus se connecter. Les données liées sont conservées.',
      confirmLabel: 'Désactiver',
      confirmDanger: true,
    });
    if (!ok) return;
    this.message.set(null);
    this.errorMessage.set(null);
    this.actionLoading.set('delete');
    this.adminService.deleteUser(this.userId).subscribe({
      next: () => void this.router.navigate([this.routes.ADMIN.USERS]),
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(err.error?.message || 'Erreur');
        this.actionLoading.set(null);
      },
    });
  }

  filterByIp(ip: string): void {
    void this.router.navigate([this.routes.ADMIN.USERS], { queryParams: { ip } });
  }

  roleLabel(role: string): string {
    if (role === USER_ROLES.ADMIN) return 'Administrateur';
    if (role === USER_ROLES.RECRUITER) return 'Recruteur';
    if (role === USER_ROLES.TRAINING_PROVIDER) return 'Centre de formation';
    if (role === USER_ROLES.INSTITUTION_PROVIDER) return 'Établissement privé';
    return 'Candidat';
  }

  userSubtitle(u: AdminUserDetail): string {
    if (u.candidateProfile) {
      return `${u.candidateProfile.firstName} ${u.candidateProfile.lastName}`.trim();
    }
    if (u.recruiterProfile?.companyName) {
      return u.recruiterProfile.companyName;
    }
    return '—';
  }

  userImageUrl(u: AdminUserDetail): string | null {
    return (
      resolveUploadUrl(u.candidateProfile?.avatarUrl ?? null) ||
      resolveUploadUrl(u.recruiterProfile?.companyLogoUrl ?? null)
    );
  }

  accountStateLabel(u: AdminUserDetail): string {
    if (u.isBanned) return 'Compte bloqué';
    if (!u.isVerified) return 'Vérification requise';
    return 'Compte opérationnel';
  }

  userInitials(u: AdminUserDetail): string {
    const sub = this.userSubtitle(u);
    if (sub && sub !== '—') {
      return sub
        .split(/\s+/)
        .map((p) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
    }
    return (u.email[0] || '?').toUpperCase();
  }
}
