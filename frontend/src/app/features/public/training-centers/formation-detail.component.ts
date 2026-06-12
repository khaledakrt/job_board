import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PublicShellComponent } from '../shared/public-shell.component';
import { PublicCatalogService } from '../services/public-catalog.service';
import { AuthService } from '../../../core/services/auth.service';
import { APP_ROUTES } from '../../../core/constants/routes.constant';
import { USER_ROLES } from '../../../core/constants/roles.constant';
import { TrainingFormationItem } from '../../../core/models/catalog.model';
import { resolveUploadUrl } from '../../../core/utils/asset-url.util';
import { deliveryModeLabel } from '../shared/catalog.constants';
import { SafeHtmlComponent } from '../../../shared/components/safe-html/safe-html.component';

@Component({
  selector: 'app-formation-detail',
  standalone: true,
  imports: [PublicShellComponent, RouterLink, SafeHtmlComponent],
  templateUrl: './formation-detail.component.html',
  styleUrl: '../shared/public-catalog.page.css',
})
export class FormationDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly catalog = inject(PublicCatalogService);
  readonly authService = inject(AuthService);

  readonly routes = APP_ROUTES;
  readonly deliveryModeLabel = deliveryModeLabel;

  readonly formation = signal<TrainingFormationItem | null>(null);
  /** Nombre affiché (API ou 0 si backend pas à jour). */
  readonly participantsCount = computed(() => {
    const n = this.formation()?.participantsCount;
    return typeof n === 'number' && !Number.isNaN(n) ? n : 0;
  });
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly actionMsg = signal<string | null>(null);
  readonly actionLoading = signal(false);

  /** Une seule inscription autorisée (y compris anciennes demandes « intéressé » en base). */
  readonly hasParticipated = computed(() => Boolean(this.formation()?.participationType));

  readonly participateButtonsDisabled = computed(
    () => this.actionLoading() || this.hasParticipated()
  );

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('Formation introuvable.');
      this.loading.set(false);
      return;
    }
    this.load(id);
  }

  load(id: string): void {
    this.catalog.getFormation(id).subscribe({
      next: (res) => {
        this.formation.set(res.data ?? null);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Formation introuvable ou non publiée.');
        this.loading.set(false);
      },
    });
  }

  mediaUrl(url: string | null | undefined): string | null {
    return resolveUploadUrl(url ?? null);
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(date);
  }

  formatPrice(price: number | null | undefined): string | null {
    if (price == null || Number.isNaN(Number(price))) return null;
    return `${Number(price).toLocaleString('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })} TND`;
  }

  get isLoggedInCandidate(): boolean {
    return this.authService.user()?.role === USER_ROLES.CANDIDATE;
  }

  participate(): void {
    const id = this.formation()?.id;
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
    this.catalog.participateFormation(id).subscribe({
      next: () => {
        this.actionLoading.set(false);
        this.actionMsg.set('Inscription enregistrée.');
        this.load(id);
      },
      error: (err) => {
        this.actionLoading.set(false);
        this.actionMsg.set(err.error?.message ?? 'Action impossible.');
      },
    });
  }
}
