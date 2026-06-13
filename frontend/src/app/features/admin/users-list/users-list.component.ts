import { Component, inject, OnDestroy, OnInit, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, takeUntil } from 'rxjs';
import { AdminService } from '../services/admin.service';
import { AdminUserListItem } from '../../../core/models/admin.model';
import { PaginationMeta } from '../../../core/models/pagination.model';
import { APP_ROUTES } from '../../../core/constants/routes.constant';
import { USER_ROLES } from '../../../core/constants/roles.constant';
import { AdminPaginationComponent } from '../shared/admin-pagination.component';
import { adminPageSummary } from '../shared/admin-pagination.util';
import { resolveUploadUrl } from '../../../core/utils/asset-url.util';

const PAGE_SIZE = 15;

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule, RouterLink, AdminPaginationComponent],
  templateUrl: './users-list.component.html',
  styleUrl: './users-list.component.css',
})
export class UsersListComponent implements OnInit, OnDestroy {
  private readonly adminService = inject(AdminService);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly routes = APP_ROUTES;
  readonly roles = USER_ROLES;
  readonly pageSize = PAGE_SIZE;

  readonly users = signal<AdminUserListItem[]>([]);
  readonly pagination = signal<PaginationMeta | null>(null);
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly filters = this.fb.nonNullable.group({
    search: [''],
    role: [''],
    banned: [''],
    ip: [''],
  });
  private readonly destroy$ = new Subject<void>();

  readonly toolbarSummary = computed(() =>
    adminPageSummary(this.pagination(), 'utilisateur')
  );
  pageTitle(): string {
    const role = this.filters.controls.role.value;
    if (role === USER_ROLES.CANDIDATE) return 'Candidats';
    if (role === USER_ROLES.RECRUITER) return 'Recruteurs';
    if (role === USER_ROLES.ADMIN) return 'Administrateurs';
    return 'Comptes';
  }

  pageSubtitle(): string {
    const role = this.filters.controls.role.value;
    if (role === USER_ROLES.CANDIDATE) return 'Gérez les comptes candidats, leur vérification et leur activité.';
    if (role === USER_ROLES.RECRUITER) return 'Gérez les comptes recruteurs, leurs sociétés et leurs accès.';
    if (role === USER_ROLES.ADMIN) return 'Contrôlez les comptes administrateurs et les accès sensibles.';
    return 'Gérez les comptes par rôle, statut, e-mail et adresse IP.';
  }
  readonly pageSummary = computed(() => {
    const users = this.users();
    return {
      total: users.length,
      banned: users.filter((u) => u.isBanned).length,
      unverified: users.filter((u) => !u.isVerified).length,
      recruiters: users.filter((u) => u.recruiterProfile).length,
    };
  });

  ngOnInit(): void {
    this.route.queryParamMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      this.filters.patchValue(
        {
          role: params.get('role') || '',
          ip: params.get('ip') || '',
        },
        { emitEvent: false }
      );
      this.load(1);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(page: number): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    const f = this.filters.getRawValue();
    const params: Record<string, string | number> = { page, limit: PAGE_SIZE };
    if (f.search) params['search'] = f.search;
    if (f.role) params['role'] = f.role;
    if (f.banned) params['banned'] = f.banned;
    if (f.ip) params['ip'] = f.ip;

    this.adminService.listUsers(params).subscribe({
      next: (res) => {
        this.users.set(res.data || []);
        this.pagination.set(res.pagination);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(err.error?.message || 'Erreur de chargement');
        this.loading.set(false);
      },
    });
  }

  applyFilters(): void {
    this.load(1);
  }

  resetFilters(): void {
    this.filters.reset();
    void this.router.navigate([this.routes.ADMIN.USERS]);
  }

  roleLabel(role: string): string {
    if (role === USER_ROLES.ADMIN) return 'Admin';
    if (role === USER_ROLES.RECRUITER) return 'Recruteur';
    if (role === USER_ROLES.TRAINING_PROVIDER) return 'Centre de formation';
    if (role === USER_ROLES.INSTITUTION_PROVIDER) return 'Établissement';
    return 'Candidat';
  }

  userImageUrl(user: AdminUserListItem): string | null {
    return (
      resolveUploadUrl(user.candidateProfile?.avatarUrl ?? null) ||
      resolveUploadUrl(user.recruiterProfile?.companyLogoUrl ?? null)
    );
  }

  userInitial(user: AdminUserListItem): string {
    const profileName = user.candidateProfile
      ? `${user.candidateProfile.firstName} ${user.candidateProfile.lastName}`.trim()
      : user.recruiterProfile?.companyName || user.email;
    return (profileName.charAt(0) || '?').toUpperCase();
  }
}
