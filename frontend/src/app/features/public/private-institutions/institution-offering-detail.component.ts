import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PublicShellComponent } from '../shared/public-shell.component';
import { PublicCatalogService } from '../services/public-catalog.service';
import {
  InstitutionOfferingItem,
  PrivateInstitutionCard,
} from '../../../core/models/catalog.model';
import { APP_ROUTES } from '../../../core/constants/routes.constant';
import { USER_ROLES } from '../../../core/constants/roles.constant';
import { AuthService } from '../../../core/services/auth.service';
import { SafeHtmlComponent } from '../../../shared/components/safe-html/safe-html.component';

type OfferingDetail = InstitutionOfferingItem & { institution?: PrivateInstitutionCard };

@Component({
  selector: 'app-institution-offering-detail',
  standalone: true,
  imports: [PublicShellComponent, RouterLink, SafeHtmlComponent],
  templateUrl: './institution-offering-detail.component.html',
  styleUrl: '../shared/public-catalog.page.css',
})
export class InstitutionOfferingDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly catalog = inject(PublicCatalogService);
  readonly authService = inject(AuthService);

  readonly routes = APP_ROUTES;
  readonly item = signal<OfferingDetail | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly actionMsg = signal<string | null>(null);
  readonly actionLoading = signal(false);
  readonly hasParticipated = computed(() => Boolean(this.item()?.participationType));
  readonly participateButtonsDisabled = computed(
    () => this.actionLoading() || this.hasParticipated()
  );

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('Publication introuvable.');
      this.loading.set(false);
      return;
    }
    this.catalog.getInstitutionOffering(id).subscribe({
      next: (res) => {
        this.item.set(res.data ?? null);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Publication introuvable ou non publiée.');
        this.loading.set(false);
      },
    });
  }

  typeLabel(type: string | null | undefined): string {
    const labels: Record<string, string> = {
      program: 'Programme',
      event: 'Événement',
      announcement: 'Actualité / annonce',
    };
    return labels[type ?? ''] ?? 'Publication';
  }

  dateLabel(item: InstitutionOfferingItem): string {
    const start = item.startDate ? new Date(item.startDate).toLocaleDateString('fr-FR') : '';
    const end = item.endDate ? new Date(item.endDate).toLocaleDateString('fr-FR') : '';
    if (start && end && start !== end) return `${start} - ${end}`;
    return start || end || '';
  }

  get isLoggedInCandidate(): boolean {
    return this.authService.user()?.role === USER_ROLES.CANDIDATE;
  }

  participate(): void {
    const id = this.item()?.id;
    if (!id) return;

    if (!this.authService.user()) {
      void this.router.navigate([this.routes.AUTH.LOGIN], {
        queryParams: { returnUrl: this.router.url },
      });
      return;
    }

    if (!this.isLoggedInCandidate) {
      this.actionMsg.set('Seuls les comptes candidats peuvent s’inscrire.');
      return;
    }

    if (this.hasParticipated()) {
      return;
    }

    this.actionLoading.set(true);
    this.actionMsg.set(null);
    this.catalog.participateInstitutionOffering(id).subscribe({
      next: () => {
        this.actionLoading.set(false);
        this.actionMsg.set('Inscription enregistrée.');
        this.catalog.getInstitutionOffering(id).subscribe((res) => {
          this.item.set(res.data ?? null);
        });
      },
      error: (err) => {
        this.actionLoading.set(false);
        this.actionMsg.set(err.error?.message ?? 'Action impossible.');
      },
    });
  }
}
