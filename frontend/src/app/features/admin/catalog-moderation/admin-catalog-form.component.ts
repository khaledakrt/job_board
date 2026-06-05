import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AdminService } from '../services/admin.service';
import { APP_ROUTES } from '../../../core/constants/routes.constant';
import {
  CatalogKind,
  catalogListRoute,
  catalogDetailRoute,
  catalogTitle,
} from './admin-catalog.shared';
import {
  INSTITUTION_TYPE_OPTIONS,
  TRAINING_DELIVERY_OPTIONS,
} from '../../public/shared/catalog.constants';
import { InstitutionType } from '../../../core/models/catalog.model';

@Component({
  selector: 'app-admin-catalog-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './admin-catalog-form.component.html',
  styleUrl: '../admin-shared.css',
})
export class AdminCatalogFormComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly routes = APP_ROUTES;
  readonly deliveryOptions = TRAINING_DELIVERY_OPTIONS.filter((o) => o.value !== '');
  readonly institutionTypes = INSTITUTION_TYPE_OPTIONS.filter((o) => o.value !== '');

  readonly kind = signal<CatalogKind>('training-centers');
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
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
    status: ['published' as 'pending' | 'published' | 'rejected'],
  });

  ngOnInit(): void {
    const k = this.route.snapshot.data['kind'];
    if (k === 'private-institutions' || k === 'training-centers') {
      this.kind.set(k);
    }
  }

  title(): string {
    return this.kind() === 'training-centers'
      ? 'Nouveau centre de formation'
      : 'Nouvel établissement privé';
  }

  listLink(): string {
    return catalogListRoute(this.kind());
  }

  breadcrumbTitle(): string {
    return catalogTitle(this.kind());
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.errorMessage.set(null);
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
    } else {
      body['institutionType'] = v.institutionType;
      body['mapUrl'] = v.mapUrl.trim() || null;
    }

    const req =
      this.kind() === 'training-centers'
        ? this.adminService.createTrainingCenter(body)
        : this.adminService.createPrivateInstitution(body);

    req.subscribe({
      next: (res) => {
        const id = res.data?.id;
        if (id) {
          void this.router.navigateByUrl(catalogDetailRoute(this.kind(), id));
        } else {
          void this.router.navigateByUrl(this.listLink());
        }
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(err.error?.message || 'Création impossible');
        this.saving.set(false);
      },
    });
  }
}
