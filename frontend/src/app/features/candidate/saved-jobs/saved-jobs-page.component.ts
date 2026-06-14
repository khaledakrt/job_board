import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { APP_ROUTES } from '../../../core/constants/routes.constant';
import { JobAlertItem, SavedJobItem } from '../../../core/models/candidate-profile.model';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { SavedJobService } from '../services/saved-job.service';
import { JobAlertService } from '../services/job-alert.service';
import { resolveUploadUrl } from '../../../core/utils/asset-url.util';
import { salaryDisplayLabel } from '../../../core/utils/job-display.util';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

@Component({
  selector: 'app-saved-jobs-page',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, DatePipe, TranslatePipe],
  templateUrl: './saved-jobs-page.component.html',
  styleUrl: './saved-jobs-page.component.css',
})
export class SavedJobsPageComponent implements OnInit {
  private readonly savedService = inject(SavedJobService);
  private readonly alertService = inject(JobAlertService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly routes = APP_ROUTES;
  readonly tab = signal<'saved' | 'alerts'>('saved');
  readonly savedJobs = signal<SavedJobItem[]>([]);
  readonly alerts = signal<JobAlertItem[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly editingAlertId = signal<string | null>(null);
  readonly savedPage = signal(1);
  readonly alertsPage = signal(1);
  readonly pageSize = 6;

  readonly sortedAlerts = computed(() =>
    [...this.alerts()].sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    })
  );
  readonly pagedSavedJobs = computed(() => this.paginate(this.savedJobs(), this.savedPage()));
  readonly pagedAlerts = computed(() => this.paginate(this.sortedAlerts(), this.alertsPage()));
  readonly savedTotalPages = computed(() => this.totalPages(this.savedJobs().length));
  readonly alertsTotalPages = computed(() => this.totalPages(this.alerts().length));

  readonly alertEditForm = this.fb.nonNullable.group({
    label: [''],
    frequency: ['weekly' as 'weekly' | 'monthly'],
    isActive: [true],
  });

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.savedService.list().subscribe({
      next: (res) => this.savedJobs.set(res.data || []),
      error: () => this.error.set('Impossible de charger les offres enregistrées.'),
    });
    this.alertService.list().subscribe({
      next: (res) => {
        this.alerts.set(res.data || []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  setTab(t: 'saved' | 'alerts'): void {
    this.tab.set(t);
  }

  viewJob(jobId: string): void {
    const url = this.router.serializeUrl(this.router.createUrlTree(['/offres', jobId]));
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  logo(url: string | null | undefined): string | null {
    return resolveUploadUrl(url);
  }

  salary(item: SavedJobItem): string | null {
    return item.job ? salaryDisplayLabel(item.job) : null;
  }

  formatAlertFilters(filters: Record<string, unknown>): string {
    const parts = this.alertFilterParts(filters);
    return parts.length ? parts.map((p) => p.value).join(' · ') : 'Critères larges';
  }

  alertFilterParts(filters: Record<string, unknown>): { label: string; value: string }[] {
    const parts: { label: string; value: string }[] = [];
    const add = (label: string, raw: unknown) => {
      if (raw == null) return;
      const value = Array.isArray(raw) ? raw.filter(Boolean).join(', ') : String(raw).trim();
      if (value && value !== 'all' && value !== 'date') {
        parts.push({ label, value });
      }
    };

    add('Mots-clés', filters['keywords']);
    add('Lieu', filters['location']);
    add('Entreprise', filters['company']);
    add('Secteur', filters['industry']);
    add('Contrats', filters['contracts']);
    add('Télétravail', filters['remotes']);
    add('Expérience', filters['experience']);
    add('Salaire min.', filters['minSalary']);
    if (filters['quizOnly']) {
      parts.push({ label: 'Quiz', value: 'Avec quiz' });
    }
    return parts;
  }

  startEditAlert(alert: JobAlertItem): void {
    this.editingAlertId.set(alert.id);
    this.alertEditForm.patchValue({
      label: alert.label || '',
      frequency: alert.frequency === 'monthly' ? 'monthly' : 'weekly',
      isActive: alert.isActive,
    });
  }

  frequencyLabel(alert: JobAlertItem): string {
    return alert.frequency === 'monthly'
      ? 'Mensuelle - le 1er jour du mois'
      : 'Hebdomadaire - dimanche';
  }

  setSavedPage(page: number): void {
    this.savedPage.set(Math.min(Math.max(1, page), this.savedTotalPages()));
  }

  setAlertsPage(page: number): void {
    this.alertsPage.set(Math.min(Math.max(1, page), this.alertsTotalPages()));
  }

  cancelEditAlert(): void {
    this.editingAlertId.set(null);
  }

  saveAlertEdit(alert: JobAlertItem): void {
    const v = this.alertEditForm.getRawValue();
    this.alertService
      .update(alert.id, {
        label: v.label.trim() || null,
        frequency: v.frequency,
        isActive: v.isActive,
      })
      .subscribe({
        next: (res) => {
          if (res.data) {
            this.alerts.update((list) => list.map((a) => (a.id === alert.id ? res.data! : a)));
          }
          this.editingAlertId.set(null);
        },
        error: (err: HttpErrorResponse) =>
          this.error.set(err.error?.message || 'Impossible de mettre à jour l\'alerte.'),
      });
  }

  async removeSaved(item: SavedJobItem): Promise<void> {
    const ok = await this.confirmDialog.confirm({
      title: 'Retirer',
      message: `Retirer « ${item.job?.title || 'cette offre'} » ?`,
      confirmLabel: 'Retirer',
      confirmDanger: true,
    });
    if (!ok) return;
    this.savedService.remove(item.id).subscribe({
      next: () => {
        this.savedJobs.update((l) => l.filter((s) => s.id !== item.id));
        this.setSavedPage(this.savedPage());
      },
    });
  }

  async removeAlert(alert: JobAlertItem): Promise<void> {
    const ok = await this.confirmDialog.confirm({
      title: 'Supprimer l\'alerte',
      message: 'Supprimer cette alerte ?',
      confirmLabel: 'Supprimer',
      confirmDanger: true,
    });
    if (!ok) return;
    this.alertService.remove(alert.id).subscribe({
      next: () => {
        this.alerts.update((l) => l.filter((a) => a.id !== alert.id));
        this.setAlertsPage(this.alertsPage());
      },
    });
  }

  private paginate<T>(items: T[], page: number): T[] {
    const start = (page - 1) * this.pageSize;
    return items.slice(start, start + this.pageSize);
  }

  private totalPages(total: number): number {
    return Math.max(1, Math.ceil(total / this.pageSize));
  }
}
