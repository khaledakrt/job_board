import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe, DecimalPipe } from '@angular/common';
import { AdminService, AdminOfferingItem } from '../services/admin.service';
import { APP_ROUTES } from '../../../core/constants/routes.constant';
import { CatalogPublishStatus } from '../../../core/models/admin.model';
import { AdminPaginationComponent } from '../shared/admin-pagination.component';
import { adminPageSummary } from '../shared/admin-pagination.util';
import { PaginationMeta } from '../../../core/models/pagination.model';
import {
  eventTypeLabel,
  catalogStatusLabel,
} from '../../public/shared/catalog-offerings.constants';
import {
  OfferingKind,
  OFFERING_STATUS_LABELS,
  offeringItemLabel,
  offeringPublicRoute,
  offeringSubtitle,
  offeringTitle,
} from './admin-offerings.shared';

const PAGE_SIZE = 15;

@Component({
  selector: 'app-admin-offerings-moderation',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, AdminPaginationComponent, DatePipe, DecimalPipe],
  templateUrl: './admin-offerings-moderation.component.html',
  styleUrls: ['../admin-shared.css', './admin-offerings-moderation.component.css'],
})
export class AdminOfferingsModerationComponent implements OnInit {
  private readonly admin = inject(AdminService);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);

  readonly routes = APP_ROUTES;
  readonly statusLabels = OFFERING_STATUS_LABELS;
  readonly catalogStatusLabel = catalogStatusLabel;
  readonly eventTypeLabel = eventTypeLabel;
  readonly pageSize = PAGE_SIZE;

  readonly kind = signal<OfferingKind>('formations');
  readonly items = signal<AdminOfferingItem[]>([]);
  readonly pagination = signal<PaginationMeta | null>(null);
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly actionLoading = signal<string | null>(null);

  readonly filters = this.fb.nonNullable.group({
    search: [''],
    status: [''],
  });

  readonly pageClass = computed(() =>
    this.kind() === 'formations'
      ? 'admin-offerings-page--formations'
      : 'admin-offerings-page--events'
  );

  readonly toolbarSummary = computed(() =>
    adminPageSummary(this.pagination(), offeringItemLabel(this.kind()))
  );

  ngOnInit(): void {
    const k = this.route.snapshot.data['kind'] as OfferingKind;
    if (k === 'formations' || k === 'events') {
      this.kind.set(k);
    }
    const status = this.route.snapshot.queryParamMap.get('status');
    if (status === 'pending' || status === 'published' || status === 'rejected') {
      this.filters.patchValue({ status });
    } else {
      this.filters.patchValue({ status: 'pending' });
    }
    this.load(1);
  }

  title(): string {
    return offeringTitle(this.kind());
  }

  subtitle(): string {
    return offeringSubtitle(this.kind());
  }

  setStatusFilter(status: '' | CatalogPublishStatus): void {
    this.filters.patchValue({ status });
    this.load(1);
  }

  load(page: number): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    const f = this.filters.getRawValue();
    const params: Record<string, string | number> = { page, limit: PAGE_SIZE };
    if (f.status) params['status'] = f.status;
    if (f.search.trim()) params['search'] = f.search.trim();

    const req =
      this.kind() === 'formations'
        ? this.admin.listTrainingFormations(params)
        : this.admin.listTrainingEvents(params);

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
    this.filters.reset({ search: '', status: 'pending' });
    this.load(1);
  }

  setStatus(item: AdminOfferingItem, status: CatalogPublishStatus, event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
    this.actionLoading.set(item.id);
    this.successMessage.set(null);
    const req =
      this.kind() === 'formations'
        ? this.admin.setTrainingFormationStatus(item.id, status)
        : this.admin.setTrainingEventStatus(item.id, status);

    req.subscribe({
      next: () => {
        this.actionLoading.set(null);
        this.successMessage.set(
          status === 'published'
            ? 'Publication confirmée.'
            : status === 'rejected'
              ? 'Élément refusé.'
              : 'Remis en attente de validation.'
        );
        setTimeout(() => this.successMessage.set(null), 4000);
        this.load(this.pagination()?.page ?? 1);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(err.error?.message || 'Action impossible');
        this.actionLoading.set(null);
      },
    });
  }

  publicLink(item: AdminOfferingItem): string | null {
    if (item.status !== 'published') return null;
    return offeringPublicRoute(this.kind(), item.id);
  }

  centerAdminLink(centerId?: string): string | null {
    if (!centerId) return null;
    return this.routes.ADMIN.TRAINING_CENTER_DETAIL(centerId);
  }

  formatSchedule(item: AdminOfferingItem): string {
    if (this.kind() === 'events') {
      if (!item.eventDate) return '—';
      const d = item.eventDate.slice(0, 10).split('-').reverse().join('/');
      if (item.startTime) return `${d} ${item.startTime.slice(0, 5)}`;
      return d;
    }
    if (item.startDate && item.endDate) {
      return `${item.startDate.slice(0, 10)} → ${item.endDate.slice(0, 10)}`;
    }
    if (item.startDate) return item.startDate.slice(0, 10);
    return '—';
  }
}
