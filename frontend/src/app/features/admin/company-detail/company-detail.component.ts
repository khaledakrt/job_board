import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AdminCompanyDetail, AdminSubscriptionPolicy } from '../../../core/models/admin.model';
import { JOB_STATUS_LABELS, JobStatus } from '../../../core/constants/job.constant';
import { APP_ROUTES } from '../../../core/constants/routes.constant';
import { AdminService } from '../services/admin.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { resolveUploadUrl } from '../../../core/utils/asset-url.util';

@Component({
  selector: 'app-admin-company-detail',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './company-detail.component.html',
  styleUrl: './company-detail.component.css',
})
export class CompanyDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly adminService = inject(AdminService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  readonly routes = APP_ROUTES;
  readonly company = signal<AdminCompanyDetail | null>(null);
  readonly subscriptionPolicy = signal<AdminSubscriptionPolicy | null>(null);
  readonly loading = signal(true);
  readonly actionLoading = signal<string | null>(null);
  readonly message = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  private companyId = '';

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.errorMessage.set('Entreprise introuvable.');
      this.loading.set(false);
      return;
    }
    this.companyId = id;
    this.loadCompany();
    this.loadSubscriptionPolicy();
  }

  loadCompany(): void {
    this.adminService.getCompany(this.companyId).subscribe({
      next: (res) => {
        this.company.set(res.data ?? null);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(err.error?.message || 'Impossible de charger cette entreprise.');
        this.loading.set(false);
      },
    });
  }

  loadSubscriptionPolicy(): void {
    this.adminService.getSubscriptionPolicy().subscribe({
      next: (res) => this.subscriptionPolicy.set(res.data ?? null),
      error: () => undefined,
    });
  }

  async setPolicy(mode: AdminSubscriptionPolicy['mode']): Promise<void> {
    if (this.subscriptionPolicy()?.mode === mode) return;
    const ok = await this.confirmDialog.confirm({
      title: mode === 'free_all' ? 'Rendre la publication gratuite ?' : 'Rendre le paiement obligatoire ?',
      message:
        mode === 'free_all'
          ? 'Toutes les entreprises pourront publier sans abonnement actif.'
          : 'Seules les entreprises avec abonnement actif ou accès manuel pourront publier.',
      confirmLabel: 'Confirmer',
      confirmDanger: mode === 'paid_required',
    });
    if (!ok) return;

    this.actionLoading.set('policy');
    this.message.set(null);
    this.errorMessage.set(null);
    this.adminService.updateSubscriptionPolicy(mode).subscribe({
      next: () => {
        this.loadSubscriptionPolicy();
        this.message.set(
          mode === 'paid_required'
            ? 'Mode plateforme mis à jour : les offres déjà publiées restent visibles; les nouvelles publications exigent un abonnement actif.'
            : 'Mode plateforme mis à jour : publication gratuite pour toutes les entreprises.'
        );
        this.actionLoading.set(null);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(err.error?.message || 'Impossible de modifier la politique.');
        this.actionLoading.set(null);
      },
    });
  }

  async activateManualSubscription(months: number): Promise<void> {
    const ok = await this.confirmDialog.confirm({
      title: `Activer un accès gratuit ${months === 12 ? '1 an' : '1 mois'} ?`,
      message: 'Cette entreprise pourra publier sans passer par le paiement pendant cette période.',
      confirmLabel: 'Activer',
    });
    if (!ok) return;

    this.actionLoading.set(`activate-${months}`);
    this.message.set(null);
    this.errorMessage.set(null);
    this.adminService.activateCompanySubscription(this.companyId, months).subscribe({
      next: (res) => {
        const company = this.company();
        if (company && res.data) {
          this.company.set({ ...company, subscription: res.data });
        }
        this.message.set('Accès publication gratuit activé pour cette entreprise.');
        this.actionLoading.set(null);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(err.error?.message || 'Impossible d’activer l’abonnement.');
        this.actionLoading.set(null);
      },
    });
  }

  async cancelSubscription(): Promise<void> {
    const ok = await this.confirmDialog.confirm({
      title: 'Retirer l’accès gratuit de cette entreprise ?',
      message:
        'Son abonnement manuel sera annulé. En mode paiement obligatoire, elle devra payer pour publier.',
      confirmLabel: 'Retirer accès gratuit',
      confirmDanger: true,
    });
    if (!ok) return;

    this.actionLoading.set('cancel');
    this.message.set(null);
    this.errorMessage.set(null);
    this.adminService.cancelCompanySubscription(this.companyId).subscribe({
      next: (res) => {
        const company = this.company();
        if (company && res.data) {
          this.company.set({ ...company, subscription: res.data });
        }
        this.message.set(
          'Accès publication annulé pour cette entreprise. Les offres déjà publiées restent visibles; les nouvelles publications seront bloquées sans paiement.'
        );
        this.actionLoading.set(null);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(err.error?.message || 'Impossible d’annuler l’abonnement.');
        this.actionLoading.set(null);
      },
    });
  }

  policyLabel(mode: AdminSubscriptionPolicy['mode'] | undefined): string {
    return mode === 'free_all' ? 'Gratuit pour toutes les entreprises' : 'Paiement obligatoire';
  }

  subscriptionStatusLabel(status: string | null | undefined): string {
    if (status === 'active') return 'Abonnement actif';
    if (status === 'canceled') return 'Accès annulé';
    return 'Aucun abonnement';
  }

  publicationAccessLabel(company: AdminCompanyDetail): string {
    if (this.subscriptionPolicy()?.mode === 'free_all') {
      return 'Autorisée par le mode gratuit';
    }
    return company.subscription?.isActive
      ? 'Autorisée par abonnement actif'
      : 'Bloquée: paiement requis';
  }

  logoUrl(company: AdminCompanyDetail): string | null {
    return resolveUploadUrl(company.logoUrl);
  }

  jobStatusLabel(status: string): string {
    return JOB_STATUS_LABELS[status as JobStatus] ?? status;
  }
}
