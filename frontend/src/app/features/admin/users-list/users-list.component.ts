import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AdminService } from '../services/admin.service';
import { AdminUserListItem } from '../../../core/models/admin.model';
import { PaginationMeta } from '../../../core/models/pagination.model';
import { APP_ROUTES } from '../../../core/constants/routes.constant';
import { USER_ROLES } from '../../../core/constants/roles.constant';
import { AdminPaginationComponent } from '../shared/admin-pagination.component';
import { adminPageSummary } from '../shared/admin-pagination.util';

const PAGE_SIZE = 15;

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, AdminPaginationComponent],
  templateUrl: './users-list.component.html',
  styleUrl: './users-list.component.css',
})
export class UsersListComponent implements OnInit {
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

  readonly toolbarSummary = computed(() =>
    adminPageSummary(this.pagination(), 'utilisateur')
  );

  ngOnInit(): void {
    const ip = this.route.snapshot.queryParamMap.get('ip');
    if (ip) {
      this.filters.patchValue({ ip });
    }
    this.load(1);
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
    this.load(1);
  }

  roleLabel(role: string): string {
    if (role === USER_ROLES.ADMIN) return 'Admin';
    if (role === USER_ROLES.RECRUITER) return 'Recruteur';
    return 'Candidat';
  }
}
