import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { AdminService } from '../services/admin.service';
import { AdminCatalogListItem } from '../../../core/models/admin.model';
import { PaginationMeta } from '../../../core/models/pagination.model';
import { APP_ROUTES } from '../../../core/constants/routes.constant';
import { AdminPaginationComponent } from '../shared/admin-pagination.component';
import { adminPageSummary } from '../shared/admin-pagination.util';
import {
  CatalogKind,
  CATALOG_STATUS_LABELS,
  catalogDetailRoute,
  catalogNewRoute,
  catalogTitle,
} from './admin-catalog.shared';
import { institutionTypeLabel } from '../../public/shared/catalog.constants';
import { InstitutionType } from '../../../core/models/catalog.model';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';

const PAGE_SIZE = 15;

@Component({
  selector: 'app-admin-catalog-moderation',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, AdminPaginationComponent, DatePipe],
  templateUrl: './admin-catalog-moderation.component.html',
  styleUrl: '../admin-shared.css',
})
export class AdminCatalogModerationComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly confirmDialog = inject(ConfirmDialogService);

  readonly routes = APP_ROUTES;
  readonly statusLabels = CATALOG_STATUS_LABELS;
  readonly pageSize = PAGE_SIZE;
  readonly institutionTypeLabel = institutionTypeLabel;

  readonly kind = signal<CatalogKind>('training-centers');
  readonly items = signal<AdminCatalogListItem[]>([]);
  readonly pagination = signal<PaginationMeta | null>(null);
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly actionLoading = signal<string | null>(null);

  readonly filters = this.fb.nonNullable.group({
    search: [''],
    status: [''],
  });

  readonly toolbarSummary = computed(() =>
    adminPageSummary(
      this.pagination(),
      this.kind() === 'training-centers' ? 'centre' : 'établissement'
    )
  );

  ngOnInit(): void {
    const k = this.route.snapshot.data['kind'];
    if (k === 'private-institutions' || k === 'training-centers') {
      this.kind.set(k);
    }
    const status = this.route.snapshot.queryParamMap.get('status');
    if (status === 'pending' || status === 'published' || status === 'rejected') {
      this.filters.patchValue({ status });
    }
    this.load(1);
  }

  setStatusFilter(status: '' | 'pending' | 'published' | 'rejected'): void {
    this.filters.patchValue({ status });
    this.load(1);
  }

  title(): string {
    return catalogTitle(this.kind());
  }

  newLink(): string {
    return catalogNewRoute(this.kind());
  }

  detailLink(id: string): string {
    return catalogDetailRoute(this.kind(), id);
  }

  load(page: number): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    const f = this.filters.getRawValue();
    const params: Record<string, string | number> = { page, limit: PAGE_SIZE };
    if (f.search.trim()) params['search'] = f.search.trim();
    if (f.status) params['status'] = f.status;

    const req =
      this.kind() === 'training-centers'
        ? this.adminService.listTrainingCenters(params)
        : this.adminService.listPrivateInstitutions(params);

    req.subscribe({
      next: (res) => {
        this.items.set(res.data ?? []);
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
    this.filters.reset({ search: '', status: '' });
    this.load(1);
  }

  async setStatus(
    id: string,
    status: 'published' | 'rejected' | 'pending',
    event?: Event
  ): Promise<void> {
    event?.stopPropagation();
    event?.preventDefault();
    const ok = await this.confirmDialog.confirm({
      title: this.statusConfirmTitle(status),
      message: this.statusConfirmMessage(status),
      confirmLabel: this.statusConfirmLabel(status),
      confirmDanger: status === 'rejected',
    });
    if (!ok) return;

    this.actionLoading.set(id);
    const req =
      this.kind() === 'training-centers'
        ? this.adminService.setTrainingCenterStatus(id, status)
        : this.adminService.setPrivateInstitutionStatus(id, status);
    req.subscribe({
      next: () => {
        this.actionLoading.set(null);
        this.load(this.pagination()?.page ?? 1);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(err.error?.message || 'Action impossible');
        this.actionLoading.set(null);
      },
    });
  }

  openDetail(id: string): void {
    void this.router.navigateByUrl(this.detailLink(id));
  }

  instLabel(type?: InstitutionType): string {
    return type ? institutionTypeLabel(type) : '—';
  }

  private statusConfirmTitle(status: 'published' | 'rejected' | 'pending'): string {
    if (status === 'published') return 'Publier la fiche';
    if (status === 'rejected') return 'Rejeter la fiche';
    return 'Repasser en attente';
  }

  private statusConfirmLabel(status: 'published' | 'rejected' | 'pending'): string {
    if (status === 'published') return 'Publier';
    if (status === 'rejected') return 'Rejeter';
    return 'Mettre en attente';
  }

  private statusConfirmMessage(status: 'published' | 'rejected' | 'pending'): string {
    if (status === 'published') {
      return 'Cette fiche deviendra visible publiquement. Confirmez-vous la publication ?';
    }
    if (status === 'rejected') {
      return 'Cette fiche ne sera plus visible et le prestataire restera bloqué. Confirmez-vous le rejet ?';
    }
    return 'Cette fiche sera retirée de la visibilité publique en attendant une nouvelle validation.';
  }
}
