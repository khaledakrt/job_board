import { Component, inject, OnInit, signal } from '@angular/core';
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

@Component({
  selector: 'app-saved-jobs-page',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, DatePipe],
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

  readonly alertEditForm = this.fb.nonNullable.group({
    label: [''],
    frequency: ['weekly' as 'daily' | 'weekly'],
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

  openJob(jobId: string, apply = false): void {
    void this.router.navigate([this.routes.CANDIDATE.JOBS], {
      queryParams: { jobId, ...(apply ? { apply: '1' } : {}) },
    });
  }

  logo(url: string | null | undefined): string | null {
    return resolveUploadUrl(url);
  }

  salary(item: SavedJobItem): string | null {
    return item.job ? salaryDisplayLabel(item.job) : null;
  }

  formatAlertFilters(filters: Record<string, unknown>): string {
    const parts: string[] = [];
    if (filters['keywords']) parts.push(String(filters['keywords']));
    if (filters['location']) parts.push(String(filters['location']));
    if (filters['company']) parts.push(String(filters['company']));
    return parts.length ? parts.join(' · ') : 'Critères larges';
  }

  startEditAlert(alert: JobAlertItem): void {
    this.editingAlertId.set(alert.id);
    this.alertEditForm.patchValue({
      label: alert.label || '',
      frequency: alert.frequency,
      isActive: alert.isActive,
    });
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
      next: () => this.savedJobs.update((l) => l.filter((s) => s.id !== item.id)),
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
      next: () => this.alerts.update((l) => l.filter((a) => a.id !== alert.id)),
    });
  }
}
