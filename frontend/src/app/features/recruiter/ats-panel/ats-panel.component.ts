import { DatePipe, DecimalPipe } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Component, inject, OnDestroy, OnInit, signal, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABELS,
  ApplicationStatus,
} from '../../../core/constants/application-status.constant';
import { APP_ROUTES } from '../../../core/constants/routes.constant';
import { Application, ApplicationDetail } from '../../../core/models/application.model';
import { Job } from '../../../core/models/job.model';
import { resolveUploadUrl } from '../../../core/utils/asset-url.util';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { RecruiterApplicationService } from '../services/application.service';
import { RecruiterJobService } from '../services/job.service';
import { RecruiterContextService } from '../services/recruiter-context.service';
import { StarRatingComponent } from '../shared/star-rating/star-rating.component';
import { PaginationMeta } from '../../../core/models/pagination.model';

type DrawerTab = 'profile' | 'cv';
type AtsViewMode = 'kanban' | 'list';

const PAGE_SIZE = 12;
const VIEW_MODE_STORAGE_KEY = 'recruiter-ats-view-mode';
const DRAWER_WIDTH_STORAGE_KEY = 'recruiter-ats-drawer-width';
const DRAWER_MIN_WIDTH_PX = 380;
const DRAWER_MAX_WIDTH_PX = 920;
const DRAWER_DEFAULT_WIDTH_PX = 520;

@Component({
  selector: 'app-ats-panel',
  standalone: true,
  imports: [ReactiveFormsModule, StarRatingComponent, DatePipe, DecimalPipe, RouterLink],
  templateUrl: './ats-panel.component.html',
  styleUrl: './ats-panel.component.css',
})
export class AtsPanelComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly applicationService = inject(RecruiterApplicationService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly jobService = inject(RecruiterJobService);
  readonly context = inject(RecruiterContextService);
  readonly routes = APP_ROUTES;

  readonly statuses = APPLICATION_STATUSES;
  readonly statusLabels = APPLICATION_STATUS_LABELS;

  /** Mêmes étapes / libellés que les colonnes Kanban */
  readonly stageColumns = APPLICATION_STATUSES.map((status) => ({
    status,
    label: APPLICATION_STATUS_LABELS[status],
  }));

  readonly jobs = signal<Job[]>([]);
  readonly applications = signal<Application[]>([]);
  readonly selectedApplication = signal<ApplicationDetail | null>(null);
  readonly panelOpen = signal(false);
  readonly drawerTab = signal<DrawerTab>('profile');
  readonly coverLetterExpanded = signal(false);
  readonly drawerWidthPx = signal(DRAWER_DEFAULT_WIDTH_PX);
  readonly drawerResizing = signal(false);
  readonly cvPreviewSrc = signal<SafeResourceUrl | null>(null);
  readonly cvPreviewLoading = signal(false);
  readonly cvPreviewError = signal<string | null>(null);

  private drawerResizeCleanup: (() => void) | null = null;
  private cvObjectUrl: string | null = null;
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly selectedJobId = signal<string>('');
  readonly viewMode = signal<AtsViewMode>('kanban');
  readonly pagination = signal<PaginationMeta | null>(null);
  readonly currentPage = signal(1);
  readonly pageSize = PAGE_SIZE;

  readonly pageSummary = computed(() => {
    const p = this.pagination();
    if (!p || p.totalItems === 0) return '';
    const start = (p.page - 1) * p.limit + 1;
    const end = Math.min(p.page * p.limit, p.totalItems);
    return `${start}–${end} sur ${p.totalItems} candidature${p.totalItems > 1 ? 's' : ''}`;
  });

  readonly pageNumbers = computed(() => {
    const p = this.pagination();
    if (!p) return [];
    return Array.from({ length: p.totalPages }, (_, i) => i + 1);
  });

  readonly selectedJobTitle = computed(() => {
    const id = this.selectedJobId();
    if (!id) return null;
    return this.jobs().find((j) => j.id === id)?.title ?? null;
  });

  readonly noteForm = this.fb.nonNullable.group({
    noteText: ['', [Validators.required, Validators.minLength(1)]],
    evaluationText: [''],
  });

  readonly columns = computed(() => {
    const grouped: Record<ApplicationStatus, Application[]> = {
      applied: [],
      screening: [],
      interview: [],
      offer: [],
      rejected: [],
    };

    for (const app of this.applications()) {
      grouped[app.status].push(app);
    }

    return APPLICATION_STATUSES.map((status) => ({
      status,
      label: APPLICATION_STATUS_LABELS[status],
      items: grouped[status],
    }));
  });

  ngOnInit(): void {
    const stored = sessionStorage.getItem(VIEW_MODE_STORAGE_KEY);
    if (stored === 'kanban' || stored === 'list') {
      this.viewMode.set(stored);
    }
    this.restoreDrawerWidth();

    this.route.queryParamMap.subscribe((params) => {
      this.selectedJobId.set(params.get('jobId') || '');
      const applicationId = params.get('applicationId') || '';
      this.currentPage.set(1);
      this.loadApplications(1, applicationId || undefined);
    });
    this.loadJobs();
  }

  ngOnDestroy(): void {
    this.drawerResizeCleanup?.();
    this.stopDrawerResize();
    this.revokeCvObjectUrl();
  }

  loadJobs(): void {
    this.jobService.list({ page: 1, limit: 100 }).subscribe({
      next: (res) => this.jobs.set(res.data || []),
    });
  }

  loadApplications(page = this.currentPage(), openApplicationId?: string): void {
    this.loading.set(true);
    this.currentPage.set(page);
    const jobId = this.selectedJobId() || undefined;

    this.applicationService
      .list({
        jobId,
        page,
        limit: PAGE_SIZE,
      })
      .subscribe({
        next: (res) => {
          this.applications.set(res.data || []);
          this.pagination.set(res.pagination || null);
          this.loading.set(false);
          if (openApplicationId) {
            this.openApplicationFromQuery(openApplicationId);
          }
        },
        error: () => {
          this.errorMessage.set('Impossible de charger les candidatures.');
          this.loading.set(false);
        },
      });
  }

  setViewMode(mode: AtsViewMode): void {
    if (this.viewMode() === mode) return;
    this.viewMode.set(mode);
    sessionStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
    this.loadApplications(1);
  }

  goToPage(page: number): void {
    const p = this.pagination();
    if (!p || page < 1 || page > p.totalPages) return;
    this.loadApplications(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onJobFilterChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedJobId.set(value);
    this.router.navigate([this.routes.RECRUITER.ATS], {
      queryParams: value ? { jobId: value } : {},
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  clearJobFilter(): void {
    this.selectedJobId.set('');
    this.router.navigate([this.routes.RECRUITER.ATS], { queryParams: {} });
  }

  async onListStatusChange(app: Application, event: Event): Promise<void> {
    const status = (event.target as HTMLSelectElement).value as ApplicationStatus;
    if (!this.context.canDecideApplication() || app.status === status) return;

    const ok = await this.confirmDialog.confirm({
      title: 'Changer l\'étape',
      message: this.statusChangeMessage(app, status),
      confirmLabel: 'Confirmer',
    });
    if (!ok) {
      (event.target as HTMLSelectElement).value = app.status;
      return;
    }
    this.updateStatus(app.id, status, app.rating);
  }

  candidateInitials(app: Application | ApplicationDetail): string {
    const name = this.candidateName(app);
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
  }

  private revokeCvObjectUrl(): void {
    if (this.cvObjectUrl) {
      URL.revokeObjectURL(this.cvObjectUrl);
      this.cvObjectUrl = null;
    }
  }

  loadCvPreview(): void {
    const selected = this.selectedApplication();
    if (!selected) return;

    const url = this.resumeUrl(selected);
    this.revokeCvObjectUrl();
    this.cvPreviewSrc.set(null);
    this.cvPreviewError.set(null);

    if (!url) return;

    this.cvPreviewLoading.set(true);

    fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.blob();
      })
      .then((blob) => {
        this.revokeCvObjectUrl();
        const typed =
          blob.type && blob.type !== 'application/octet-stream'
            ? blob
            : new Blob([blob], { type: 'application/pdf' });
        this.cvObjectUrl = URL.createObjectURL(typed);
        this.cvPreviewSrc.set(
          this.sanitizer.bypassSecurityTrustResourceUrl(this.cvObjectUrl)
        );
        this.cvPreviewLoading.set(false);
      })
      .catch(() => {
        this.cvPreviewLoading.set(false);
        this.cvPreviewError.set(
          'Aperçu indisponible dans le panneau. Utilisez « Ouvrir le PDF ».'
        );
      });
  }

  async onDrop(event: DragEvent, status: ApplicationStatus): Promise<void> {
    event.preventDefault();
    if (!this.context.canDecideApplication()) return;

    const applicationId = event.dataTransfer?.getData('applicationId');
    if (!applicationId) return;

    const app = this.applications().find((a) => a.id === applicationId);
    if (!app || app.status === status) return;

    const ok = await this.confirmDialog.confirm({
      title: 'Changer l\'étape',
      message: this.statusChangeMessage(app, status),
      confirmLabel: 'Confirmer',
    });
    if (!ok) return;

    this.updateStatus(applicationId, status, app.rating);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onDragStart(event: DragEvent, applicationId: string): void {
    event.dataTransfer?.setData('applicationId', applicationId);
  }

  private openApplicationFromQuery(applicationId: string): void {
    const inList = this.applications().find((a) => a.id === applicationId);
    if (inList) {
      this.openPanel(inList);
    } else {
      this.openPanelById(applicationId);
    }
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { applicationId: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  openPanelById(applicationId: string, tab: DrawerTab = 'profile'): void {
    this.drawerTab.set(tab);
    this.applicationService.getById(applicationId).subscribe({
      next: (res) => {
        if (res.data) {
          this.selectedApplication.set(res.data);
          this.noteForm.patchValue({ noteText: '', evaluationText: '' });
          this.panelOpen.set(true);
          if (this.drawerTab() === 'cv') {
            this.loadCvPreview();
          }
        }
      },
      error: () => this.errorMessage.set('Impossible de charger le profil candidat.'),
    });
  }

  openPanel(application: Application, tab: DrawerTab = 'profile'): void {
    this.drawerTab.set(tab);
    this.applicationService.getById(application.id).subscribe({
      next: (res) => {
        if (res.data) {
          this.selectedApplication.set(res.data);
          this.noteForm.patchValue({ noteText: '', evaluationText: '' });
          this.panelOpen.set(true);
          if (this.drawerTab() === 'cv') {
            this.loadCvPreview();
          }
        }
      },
      error: () => this.errorMessage.set('Impossible de charger le profil candidat.'),
    });
  }

  closePanel(): void {
    this.panelOpen.set(false);
    this.selectedApplication.set(null);
    this.drawerTab.set('profile');
    this.coverLetterExpanded.set(false);
    this.stopDrawerResize();
    this.revokeCvObjectUrl();
    this.cvPreviewSrc.set(null);
    this.cvPreviewLoading.set(false);
    this.cvPreviewError.set(null);
  }

  private restoreDrawerWidth(): void {
    const raw = sessionStorage.getItem(DRAWER_WIDTH_STORAGE_KEY);
    if (!raw) return;
    const parsed = Number.parseInt(raw, 10);
    if (Number.isFinite(parsed)) {
      this.drawerWidthPx.set(this.clampDrawerWidth(parsed));
    }
  }

  private clampDrawerWidth(width: number): number {
    const max = Math.min(DRAWER_MAX_WIDTH_PX, Math.round(window.innerWidth * 0.92));
    return Math.min(max, Math.max(DRAWER_MIN_WIDTH_PX, width));
  }

  onDrawerResizeStart(event: MouseEvent): void {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startWidth = this.drawerWidthPx();
    this.drawerResizing.set(true);
    document.body.classList.add('ats-drawer-resizing');

    const onMove = (e: MouseEvent) => {
      const delta = startX - e.clientX;
      this.drawerWidthPx.set(this.clampDrawerWidth(startWidth + delta));
    };

    const onUp = () => {
      this.drawerResizeCleanup = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      this.drawerResizing.set(false);
      document.body.classList.remove('ats-drawer-resizing');
      sessionStorage.setItem(DRAWER_WIDTH_STORAGE_KEY, String(this.drawerWidthPx()));
    };

    this.drawerResizeCleanup = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      this.drawerResizing.set(false);
      document.body.classList.remove('ats-drawer-resizing');
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  private stopDrawerResize(): void {
    this.drawerResizeCleanup?.();
    this.drawerResizeCleanup = null;
    this.drawerResizing.set(false);
    document.body.classList.remove('ats-drawer-resizing');
  }

  toggleCoverLetter(): void {
    this.coverLetterExpanded.update((v) => !v);
  }

  coverLetterPreview(text: string, max = 280): string {
    if (this.coverLetterExpanded() || text.length <= max) return text;
    return `${text.slice(0, max).trim()}…`;
  }

  drawerStatusClass(status: ApplicationStatus): string {
    return `drawer-status drawer-status-${status}`;
  }

  setDrawerTab(tab: DrawerTab): void {
    this.drawerTab.set(tab);
    if (tab === 'cv') {
      this.loadCvPreview();
    }
  }

  resumeUrl(application: Application | ApplicationDetail): string | null {
    const snapshot = resolveUploadUrl(application.resumeSnapshotUrl);
    if (snapshot) return snapshot;
    const current = resolveUploadUrl(application.candidate?.resumeUrl ?? null);
    return current;
  }

  avatarUrl(application: Application | ApplicationDetail): string | null {
    return resolveUploadUrl(application.candidate?.avatarUrl ?? null);
  }

  viewResume(application: Application | ApplicationDetail): void {
    const url = this.resumeUrl(application);
    if (url) {
      window.open(url, '_blank', 'noopener');
    } else {
      this.errorMessage.set('Aucun CV disponible pour ce candidat.');
    }
  }

  async onRatingChange(rating: number): Promise<void> {
    const selected = this.selectedApplication();
    if (!selected || selected.rating === rating) return;

    const ok = await this.confirmDialog.confirm({
      title: 'Modifier la note',
      message: `Attribuer ${rating}★ à ${this.candidateName(selected)} ?`,
      confirmLabel: 'Enregistrer',
    });
    if (!ok) return;

    this.updateStatus(selected.id, selected.status, rating);
  }

  async moveToStatus(status: ApplicationStatus): Promise<void> {
    const selected = this.selectedApplication();
    if (!selected || selected.status === status) return;

    const ok = await this.confirmDialog.confirm({
      title: 'Changer l\'étape',
      message: this.statusChangeMessage(selected, status),
      confirmLabel: 'Confirmer',
    });
    if (!ok) return;

    this.updateStatus(selected.id, status, selected.rating);
  }

  statusChangeMessage(app: Application, newStatus: ApplicationStatus): string {
    return `${this.candidateName(app)} : « ${this.statusLabels[app.status]} » → « ${this.statusLabels[newStatus]} » ?`;
  }

  updateStatus(applicationId: string, status: ApplicationStatus, rating: number | null): void {
    this.saving.set(true);
    this.errorMessage.set(null);

    this.applicationService
      .updateStatus(applicationId, {
        status,
        rating: rating ?? undefined,
        evaluationText: this.noteForm.controls.evaluationText.value || undefined,
      })
      .subscribe({
        next: () => {
          this.successMessage.set('Candidature mise à jour — le candidat a été notifié.');
          this.saving.set(false);
          this.loadApplications(this.currentPage());
          if (this.selectedApplication()?.id === applicationId) {
            this.applicationService.getById(applicationId).subscribe({
              next: (res) => res.data && this.selectedApplication.set(res.data),
            });
          }
        },
        error: (err: HttpErrorResponse) => {
          this.errorMessage.set(err.error?.message || 'Échec de la mise à jour.');
          this.saving.set(false);
        },
      });
  }

  async submitNote(): Promise<void> {
    const selected = this.selectedApplication();
    if (!selected || this.noteForm.controls.noteText.invalid) {
      this.noteForm.markAllAsTouched();
      return;
    }

    const ok = await this.confirmDialog.confirm({
      title: 'Enregistrer la note',
      message: `Enregistrer cette note pour ${this.candidateName(selected)} ? Le candidat pourra être notifié.`,
      confirmLabel: 'Enregistrer',
    });
    if (!ok) return;

    this.saving.set(true);
    this.applicationService
      .addNote(selected.id, this.noteForm.controls.noteText.value)
      .subscribe({
        next: () => {
          this.successMessage.set('Note enregistrée et notification envoyée.');
          this.noteForm.controls.noteText.reset();
          this.saving.set(false);
          this.applicationService.getById(selected.id).subscribe({
            next: (res) => res.data && this.selectedApplication.set(res.data),
          });
        },
        error: (err: HttpErrorResponse) => {
          this.errorMessage.set(err.error?.message || 'Échec de l’enregistrement.');
          this.saving.set(false);
        },
      });
  }

  candidateName(app: Application): string {
    const c = app.candidate;
    if (!c) return 'Candidat';
    return [c.firstName, c.lastName].filter(Boolean).join(' ') || 'Candidat';
  }

  candidateTitle(app: Application): string {
    return app.candidate?.professionalTitle || 'Profil candidat';
  }

  stageLabel(status: ApplicationStatus): string {
    return this.statusLabels[status] ?? status;
  }

  stageBadgeClass(status: ApplicationStatus): string {
    return `stage-badge stage-badge-${status}`;
  }
}
