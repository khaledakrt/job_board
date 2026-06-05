import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { AdminService } from '../services/admin.service';
import { AdminCatalogDetail } from '../../../core/models/admin.model';
import { APP_ROUTES } from '../../../core/constants/routes.constant';
import { resolveUploadUrl } from '../../../core/utils/asset-url.util';
import {
  CatalogKind,
  CATALOG_STATUS_LABELS,
  catalogListRoute,
  catalogPublicRoute,
  catalogTitle,
} from './admin-catalog.shared';
import {
  deliveryModeLabel,
  institutionTypeLabel,
  INSTITUTION_TYPE_OPTIONS,
  TRAINING_DELIVERY_OPTIONS,
} from '../../public/shared/catalog.constants';
import {
  InstitutionOfferingItem,
  InstitutionOfferingType,
  InstitutionType,
} from '../../../core/models/catalog.model';

@Component({
  selector: 'app-admin-catalog-detail',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, DatePipe],
  templateUrl: './admin-catalog-detail.component.html',
  styleUrl: '../admin-shared.css',
})
export class AdminCatalogDetailComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly routes = APP_ROUTES;
  readonly statusLabels = CATALOG_STATUS_LABELS;
  readonly deliveryModeLabel = deliveryModeLabel;
  readonly institutionTypeLabel = institutionTypeLabel;
  readonly deliveryOptions = TRAINING_DELIVERY_OPTIONS.filter((o) => o.value !== '');
  readonly institutionTypes = INSTITUTION_TYPE_OPTIONS.filter((o) => o.value !== '');

  readonly kind = signal<CatalogKind>('training-centers');
  readonly item = signal<AdminCatalogDetail | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: [''],
    description: [''],
    city: [''],
    address: [''],
    phone: [''],
    email: [''],
    website: [''],
    trainingDomain: [''],
    deliveryMode: [''],
    institutionType: ['high_school' as InstitutionType],
    mapUrl: [''],
    status: ['pending' as 'pending' | 'published' | 'rejected'],
  });

  ngOnInit(): void {
    const k = this.route.snapshot.data['kind'];
    if (k === 'private-institutions' || k === 'training-centers') {
      this.kind.set(k);
    }
    this.load();
  }

  listLink(): string {
    return catalogListRoute(this.kind());
  }

  breadcrumbTitle(): string {
    return catalogTitle(this.kind());
  }

  load(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.errorMessage.set('Identifiant manquant');
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    const req =
      this.kind() === 'training-centers'
        ? this.adminService.getTrainingCenter(id)
        : this.adminService.getPrivateInstitution(id);
    req.subscribe({
      next: (res) => {
        const d = res.data ?? null;
        this.item.set(d);
        if (d) this.patchForm(d);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(err.error?.message || 'Fiche introuvable');
        this.loading.set(false);
      },
    });
  }

  patchForm(d: AdminCatalogDetail): void {
    this.form.patchValue({
      name: d.name,
      description: d.description ?? '',
      city: d.city ?? '',
      address: d.address ?? '',
      phone: d.phone ?? '',
      email: d.email ?? '',
      website: d.website ?? '',
      trainingDomain: d.trainingDomain ?? '',
      deliveryMode: d.deliveryMode ?? '',
      institutionType: (d.institutionType as InstitutionType) ?? 'high_school',
      mapUrl: d.mapUrl ?? '',
      status: d.status,
    });
  }

  mediaUrl(url: string | null | undefined): string | null {
    return resolveUploadUrl(url ?? null);
  }

  publicLink(): string {
    const id = this.item()?.id;
    return id ? catalogPublicRoute(this.kind(), id) : '/';
  }

  setStatus(status: 'published' | 'rejected' | 'pending'): void {
    const id = this.item()?.id;
    if (!id) return;
    this.saving.set(true);
    this.errorMessage.set(null);
    const req =
      this.kind() === 'training-centers'
        ? this.adminService.setTrainingCenterStatus(id, status)
        : this.adminService.setPrivateInstitutionStatus(id, status);
    req.subscribe({
      next: () => {
        this.successMessage.set('Statut mis à jour');
        this.saving.set(false);
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(err.error?.message || 'Action impossible');
        this.saving.set(false);
      },
    });
  }

  instLabel(type?: InstitutionType): string {
    return type ? institutionTypeLabel(type) : '—';
  }

  institutionOfferingGroups(): Array<{
    type: InstitutionOfferingType;
    title: string;
    items: InstitutionOfferingItem[];
  }> {
    const items = this.item()?.institutionOfferings ?? [];
    return [
      { type: 'program' as const, title: 'Programmes', items: items.filter((i) => i.offeringType === 'program') },
      { type: 'event' as const, title: 'Événements', items: items.filter((i) => i.offeringType === 'event') },
      {
        type: 'announcement' as const,
        title: 'Actualités & annonces',
        items: items.filter((i) => i.offeringType === 'announcement'),
      },
      {
        type: 'opportunity' as const,
        title: 'Offres & stages',
        items: items.filter((i) => i.offeringType === 'opportunity'),
      },
    ].filter((group) => group.items.length);
  }

  offeringStatusLabel(status: string): string {
    if (status === 'draft') return 'Brouillon';
    return this.statusLabels[status as keyof typeof this.statusLabels] ?? status;
  }

  setInstitutionOfferingStatus(
    publication: InstitutionOfferingItem,
    status: 'pending' | 'published' | 'rejected'
  ): void {
    this.saving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.adminService.setInstitutionOfferingStatus(publication.id, status).subscribe({
      next: () => {
        this.successMessage.set('Publication établissement mise à jour');
        this.saving.set(false);
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(err.error?.message || 'Action impossible');
        this.saving.set(false);
      },
    });
  }

  save(): void {
    const id = this.item()?.id;
    if (!id) return;
    this.saving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    const v = this.form.getRawValue();
    const body: Record<string, unknown> = {
      name: v.name.trim(),
      description: v.description.trim() || null,
      city: v.city.trim() || null,
      address: v.address.trim() || null,
      phone: v.phone.trim() || null,
      email: v.email.trim() || null,
      website: v.website.trim() || null,
      status: v.status,
    };
    if (this.kind() === 'training-centers') {
      body['trainingDomain'] = v.trainingDomain.trim() || null;
      if (v.deliveryMode) body['deliveryMode'] = v.deliveryMode;
      else body['deliveryMode'] = null;
    } else {
      body['institutionType'] = v.institutionType;
      body['mapUrl'] = v.mapUrl.trim() || null;
    }
    const req =
      this.kind() === 'training-centers'
        ? this.adminService.updateTrainingCenter(id, body)
        : this.adminService.updatePrivateInstitution(id, body);
    req.subscribe({
      next: () => {
        this.successMessage.set('Fiche enregistrée');
        this.saving.set(false);
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(err.error?.message || 'Enregistrement impossible');
        this.saving.set(false);
      },
    });
  }
}
