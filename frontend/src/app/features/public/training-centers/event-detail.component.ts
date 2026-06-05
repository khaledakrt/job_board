import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PublicShellComponent } from '../shared/public-shell.component';
import { PublicCatalogService } from '../services/public-catalog.service';
import { AuthService } from '../../../core/services/auth.service';
import { APP_ROUTES } from '../../../core/constants/routes.constant';
import { USER_ROLES } from '../../../core/constants/roles.constant';
import { TrainingEventItem } from '../../../core/models/catalog.model';
import { resolveUploadUrl } from '../../../core/utils/asset-url.util';
import { eventTypeLabel } from '../shared/catalog-offerings.constants';
import { SafeHtmlComponent } from '../../../shared/components/safe-html/safe-html.component';

@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [PublicShellComponent, RouterLink, SafeHtmlComponent],
  templateUrl: './event-detail.component.html',
  styleUrl: '../shared/public-catalog.page.css',
})
export class EventDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly catalog = inject(PublicCatalogService);
  readonly authService = inject(AuthService);

  readonly routes = APP_ROUTES;
  readonly eventTypeLabel = eventTypeLabel;

  readonly event = signal<TrainingEventItem | null>(null);
  readonly participantsCount = computed(() => {
    const n = this.event()?.participantsCount;
    return typeof n === 'number' && !Number.isNaN(n) ? n : 0;
  });
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly actionMsg = signal<string | null>(null);
  readonly actionLoading = signal(false);

  readonly hasParticipated = computed(() => Boolean(this.event()?.participationType));

  readonly participateButtonsDisabled = computed(
    () => this.actionLoading() || this.hasParticipated()
  );

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('Événement introuvable.');
      this.loading.set(false);
      return;
    }
    this.load(id);
  }

  load(id: string): void {
    this.catalog.getEvent(id).subscribe({
      next: (res) => {
        this.event.set(res.data ?? null);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Événement introuvable ou non publié.');
        this.loading.set(false);
      },
    });
  }

  mediaUrl(url: string | null | undefined): string | null {
    return resolveUploadUrl(url ?? null);
  }

  get isLoggedInCandidate(): boolean {
    return this.authService.user()?.role === USER_ROLES.CANDIDATE;
  }

  participate(): void {
    const id = this.event()?.id;
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
    this.catalog.participateEvent(id).subscribe({
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
