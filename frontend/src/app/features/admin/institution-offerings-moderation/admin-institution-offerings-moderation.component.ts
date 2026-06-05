import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AdminService } from '../services/admin.service';
import { APP_ROUTES } from '../../../core/constants/routes.constant';
import {
  InstitutionOfferingItem,
  InstitutionOfferingStatus,
  InstitutionOfferingType,
} from '../../../core/models/catalog.model';
import { CatalogPublishStatus } from '../../../core/models/admin.model';
import { PaginationMeta } from '../../../core/models/pagination.model';
import { AdminPaginationComponent } from '../shared/admin-pagination.component';
import { adminPageSummary } from '../shared/admin-pagination.util';

type AdminInstitutionOffering = InstitutionOfferingItem & {
  institution?: { id: string; name: string; status: string } | null;
};

const PAGE_SIZE = 15;

@Component({
  selector: 'app-admin-institution-offerings-moderation',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe, AdminPaginationComponent],
  templateUrl: './admin-institution-offerings-moderation.component.html',
  styleUrls: [
    '../admin-shared.css',
    '../offerings-moderation/admin-offerings-moderation.component.css',
    './admin-institution-offerings-moderation.component.css',
  ],
})
export class AdminInstitutionOfferingsModerationComponent implements OnInit {
  private readonly admin = inject(AdminService);

  readonly routes = APP_ROUTES;
  readonly items = signal<AdminInstitutionOffering[]>([]);
  readonly pagination = signal<PaginationMeta | null>(null);
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly actionLoading = signal<string | null>(null);

  search = '';
  institutionSearch = '';
  typeFilter = '';
  statusFilter = 'pending';

  readonly toolbarSummary = computed(() => adminPageSummary(this.pagination(), 'publication'));

  ngOnInit(): void {
    this.load(1);
  }

  load(page: number): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    const params: Record<string, string | number> = { page, limit: PAGE_SIZE };
    if (this.search.trim()) params['search'] = this.search.trim();
    if (this.institutionSearch.trim()) params['institutionSearch'] = this.institutionSearch.trim();
    if (this.typeFilter) params['type'] = this.typeFilter;
    if (this.statusFilter) params['status'] = this.statusFilter;

    this.admin.listInstitutionOfferings(params).subscribe({
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

  resetFilters(): void {
    this.search = '';
    this.institutionSearch = '';
    this.typeFilter = '';
    this.statusFilter = 'pending';
    this.load(1);
  }

  setStatus(item: AdminInstitutionOffering, status: CatalogPublishStatus): void {
    this.actionLoading.set(item.id);
    this.successMessage.set(null);
    this.admin.setInstitutionOfferingStatus(item.id, status).subscribe({
      next: () => {
        this.actionLoading.set(null);
        this.successMessage.set(
          status === 'published'
            ? 'Publication validée.'
            : status === 'rejected'
              ? 'Publication refusée.'
              : 'Publication remise en attente.'
        );
        this.load(this.pagination()?.page ?? 1);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(err.error?.message || 'Action impossible');
        this.actionLoading.set(null);
      },
    });
  }

  typeLabel(type: InstitutionOfferingType): string {
    const labels: Record<InstitutionOfferingType, string> = {
      program: 'Programme',
      event: 'Événement',
      announcement: 'Annonce',
      opportunity: 'Offre / stage',
    };
    return labels[type];
  }

  statusLabel(status: InstitutionOfferingStatus): string {
    const labels: Record<InstitutionOfferingStatus, string> = {
      draft: 'Brouillon',
      pending: 'En attente',
      published: 'Publié',
      rejected: 'Refusé',
    };
    return labels[status];
  }

  publicLink(item: AdminInstitutionOffering): string | null {
    return item.status === 'published' ? this.routes.PUBLIC.PRIVATE_INSTITUTION_PUBLICATION(item.id) : null;
  }
}
