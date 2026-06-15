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
import {
  resolveAuthenticatedUploadUrl,
  resolveUploadUrl,
} from '../../../core/utils/asset-url.util';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { ProtectedFileService } from '../../../core/services/protected-file.service';
import { RecruiterApplicationService } from '../services/application.service';
import { RecruiterJobService } from '../services/job.service';
import { RecruiterContextService } from '../services/recruiter-context.service';
import { StarRatingComponent } from '../shared/star-rating/star-rating.component';
import { PaginationMeta } from '../../../core/models/pagination.model';

type DrawerTab = 'profile' | 'cv';
type AtsViewMode = 'kanban' | 'list';
type PendingStatusChange = {
  application: Application;
  targetStatus: ApplicationStatus;
  selectElement?: HTMLSelectElement;
};

const PAGE_SIZE = 12;
const KANBAN_PAGE_SIZE = 50;
const KANBAN_MAX_ITEMS = 200;
const NOTES_PAGE_SIZE = 10;
const ACTIVE_APPLICATION_STATUSES = APPLICATION_STATUSES.filter((status) => status !== 'rejected');
const VIEW_MODE_STORAGE_KEY = 'recruiter-ats-view-mode';
const DRAWER_WIDTH_STORAGE_KEY = 'recruiter-ats-drawer-width';
const DRAWER_MIN_WIDTH_PX = 380;
const DRAWER_MAX_WIDTH_PX = 920;
const DRAWER_DEFAULT_WIDTH_PX = 520;
const ALLOWED_STATUS_TRANSITIONS: Record<ApplicationStatus, ReadonlySet<ApplicationStatus>> = {
  applied: new Set(['applied', 'screening', 'interview', 'rejected']),
  screening: new Set(['screening', 'interview', 'offer', 'rejected']),
  interview: new Set(['interview', 'offer', 'rejected']),
  offer: new Set(['offer', 'rejected']),
  rejected: new Set(['rejected']),
};

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
  private readonly protectedFileService = inject(ProtectedFileService);
  private readonly jobService = inject(RecruiterJobService);
  readonly context = inject(RecruiterContextService);
  readonly routes = APP_ROUTES;

  readonly statuses = APPLICATION_STATUSES;
  readonly statusLabels = APPLICATION_STATUS_LABELS;

  /** Mêmes étapes / libellés que les colonnes Kanban */
  readonly stageColumns = ACTIVE_APPLICATION_STATUSES.map((status) => ({
    status,
    label: APPLICATION_STATUS_LABELS[status],
  }));
  readonly statusOptions = APPLICATION_STATUSES.map((status) => ({
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
  readonly pendingStatusChange = signal<PendingStatusChange | null>(null);
  readonly statusChangeError = signal<string | null>(null);
  readonly revealedPhoneApplicationId = signal<string | null>(null);

  private drawerResizeCleanup: (() => void) | null = null;
  private cvObjectUrl: string | null = null;
  private applicationsLoadToken = 0;
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly selectedJobId = signal<string>('');
  readonly viewMode = signal<AtsViewMode>('kanban');
  readonly pagination = signal<PaginationMeta | null>(null);
  readonly currentPage = signal(1);
  readonly notesPage = signal(1);
  readonly pageSize = PAGE_SIZE;
  readonly notesPageSize = NOTES_PAGE_SIZE;
  readonly kanbanLimitReached = signal(false);

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

  readonly paginatedNotes = computed(() => {
    const notes = this.selectedApplication()?.notes || [];
    const start = (this.notesPage() - 1) * NOTES_PAGE_SIZE;
    return notes.slice(start, start + NOTES_PAGE_SIZE);
  });

  readonly notesTotalPages = computed(() => {
    const total = this.selectedApplication()?.notes?.length || 0;
    return Math.max(1, Math.ceil(total / NOTES_PAGE_SIZE));
  });

  readonly notesRangeLabel = computed(() => {
    const total = this.selectedApplication()?.notes?.length || 0;
    if (!total) return 'Aucun élément';
    const start = (this.notesPage() - 1) * NOTES_PAGE_SIZE + 1;
    const end = Math.min(this.notesPage() * NOTES_PAGE_SIZE, total);
    return `${start}–${end} sur ${total}`;
  });

  readonly interviewResponseLabels = {
    confirmed: 'Entretien confirmé par le candidat',
    reschedule_requested: 'Le candidat demande un autre créneau',
  } as const;

  readonly noteForm = this.fb.nonNullable.group({
    noteText: ['', [Validators.required, Validators.minLength(1)]],
    evaluationText: [''],
  });

  readonly statusChangeForm = this.fb.nonNullable.group({
    evaluationText: ['', [Validators.maxLength(5000)]],
    internalNote: ['', [Validators.maxLength(5000)]],
    interviewAt: [''],
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

    return ACTIVE_APPLICATION_STATUSES.map((status) => ({
      status,
      label: APPLICATION_STATUS_LABELS[status],
      items: grouped[status],
    }));
  });

  ngOnInit(): void {
    const prefersListOnMobile = window.matchMedia('(max-width: 900px)').matches;
    const stored = sessionStorage.getItem(VIEW_MODE_STORAGE_KEY);
    if (prefersListOnMobile) {
      this.viewMode.set('list');
    } else if (stored === 'kanban' || stored === 'list') {
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
    this.loadJobsPage(1, []);
  }

  private loadJobsPage(page: number, acc: Job[]): void {
    this.jobService.list({ page, limit: 100 }).subscribe({
      next: (res) => {
        const items = [...acc, ...(res.data || [])];
        if (res.pagination?.hasNextPage) {
          this.loadJobsPage(page + 1, items);
          return;
        }
        this.jobs.set(items);
      },
      error: () => this.errorMessage.set('Impossible de charger les offres.'),
    });
  }

  loadApplications(page = this.currentPage(), openApplicationId?: string): void {
    const loadToken = ++this.applicationsLoadToken;
    this.kanbanLimitReached.set(false);

    if (this.viewMode() === 'kanban') {
      this.loadKanbanApplications(openApplicationId, loadToken);
      return;
    }

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
          if (loadToken !== this.applicationsLoadToken) return;
          this.applications.set(res.data || []);
          this.pagination.set(res.pagination || null);
          this.loading.set(false);
          if (openApplicationId) {
            this.openApplicationFromQuery(openApplicationId);
          }
        },
        error: () => {
          if (loadToken !== this.applicationsLoadToken) return;
          this.errorMessage.set('Impossible de charger les candidatures.');
          this.loading.set(false);
        },
      });
  }

  private loadKanbanApplications(openApplicationId?: string, loadToken = this.applicationsLoadToken): void {
    this.loading.set(true);
    this.currentPage.set(1);
    const jobId = this.selectedJobId() || undefined;

    this.loadKanbanPage(1, [], jobId, openApplicationId, loadToken);
  }

  private loadKanbanPage(
    page: number,
    acc: Application[],
    jobId?: string,
    openApplicationId?: string,
    loadToken = this.applicationsLoadToken
  ): void {
    this.applicationService
      .list({
        jobId,
        page,
        limit: KANBAN_PAGE_SIZE,
      })
      .subscribe({
        next: (res) => {
          if (loadToken !== this.applicationsLoadToken) return;
          const items = [...acc, ...(res.data || [])];
          const pagination = res.pagination;

          if (pagination?.hasNextPage && items.length < KANBAN_MAX_ITEMS) {
            this.loadKanbanPage(page + 1, items, jobId, openApplicationId, loadToken);
            return;
          }

          const visibleItems = items.slice(0, KANBAN_MAX_ITEMS);
          this.kanbanLimitReached.set(Boolean(pagination?.hasNextPage || items.length > KANBAN_MAX_ITEMS));

          this.applications.set(visibleItems);
          this.pagination.set({
            page: 1,
            limit: Math.max(visibleItems.length, 1),
            totalItems: pagination?.totalItems ?? items.length,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
          });
          this.loading.set(false);

          if (openApplicationId) {
            this.openApplicationFromQuery(openApplicationId);
          }
        },
        error: () => {
          if (loadToken !== this.applicationsLoadToken) return;
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

  onListStatusChange(app: Application, event: Event): void {
    const status = (event.target as HTMLSelectElement).value as ApplicationStatus;
    if (!this.context.canDecideApplication() || app.status === status) return;
    if (!this.canMoveToStatus(app.status, status)) {
      this.errorMessage.set('Transition de statut non autorisée pour cette candidature.');
      (event.target as HTMLSelectElement).value = app.status;
      return;
    }

    this.openStatusChangeModal(app, status, event.target as HTMLSelectElement);
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

    this.protectedFileService.fetchBlob(url).subscribe({
      next: (blob) => {
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
      },
      error: () => {
        this.cvPreviewLoading.set(false);
        this.cvPreviewError.set(
          'Aperçu indisponible dans le panneau. Utilisez « Ouvrir le PDF ».'
        );
      },
    });
  }

  onDrop(event: DragEvent, status: ApplicationStatus): void {
    event.preventDefault();
    if (!this.context.canDecideApplication()) return;

    const applicationId = event.dataTransfer?.getData('applicationId');
    if (!applicationId) return;

    const app = this.applications().find((a) => a.id === applicationId);
    if (!app || app.status === status) return;
    if (!this.canMoveToStatus(app.status, status)) {
      this.errorMessage.set('Transition de statut non autorisée pour cette candidature.');
      return;
    }

    this.openStatusChangeModal(app, status);
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
          this.revealedPhoneApplicationId.set(null);
          this.notesPage.set(1);
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
          this.revealedPhoneApplicationId.set(null);
          this.notesPage.set(1);
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
    this.revealedPhoneApplicationId.set(null);
    this.notesPage.set(1);
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
    return resolveAuthenticatedUploadUrl(application.resumeSnapshotUrl);
  }

  avatarUrl(application: Application | ApplicationDetail): string | null {
    return resolveUploadUrl(application.candidate?.avatarUrl ?? null);
  }

  viewResume(application: Application | ApplicationDetail): void {
    const url = this.resumeUrl(application);
    if (!url) {
      this.errorMessage.set('Aucun CV disponible pour ce candidat.');
      return;
    }

    this.protectedFileService.openFile(url, () =>
      this.errorMessage.set('Impossible d’ouvrir le CV.')
    );
  }

  async onRatingChange(rating: number): Promise<void> {
    const selected = this.selectedApplication();
    if (!selected || selected.rating === rating) return;

    const ok = await this.confirmDialog.confirm({
      title: 'Modifier la note',
      message: 'Attribuer cette note au candidat ?',
      confirmLabel: 'Enregistrer',
    });
    if (!ok) return;

    this.updateStatus(selected.id, selected.status, rating);
  }

  moveToStatus(status: ApplicationStatus): void {
    const selected = this.selectedApplication();
    if (!selected || selected.status === status) return;
    if (!this.canMoveToStatus(selected.status, status)) {
      this.errorMessage.set('Transition de statut non autorisée pour cette candidature.');
      return;
    }

    this.openStatusChangeModal(selected, status);
  }

  openStatusChangeModal(
    application: Application,
    targetStatus: ApplicationStatus,
    selectElement?: HTMLSelectElement
  ): void {
    this.statusChangeError.set(null);
    const existingInterviewAt =
      targetStatus === 'interview' && application.interviewAt
        ? this.toDatetimeLocalValue(application.interviewAt)
        : '';
    this.statusChangeForm.reset({
      evaluationText: this.noteForm.controls.evaluationText.value || '',
      internalNote: '',
      interviewAt: existingInterviewAt,
    });
    this.pendingStatusChange.set({ application, targetStatus, selectElement });
  }

  rescheduleInterview(application: Application): void {
    if (!this.context.canDecideApplication()) return;
    this.openStatusChangeModal(application, 'interview');
  }

  revealCandidatePhone(application: Application): void {
    if (!application.candidate?.phone) return;
    this.revealedPhoneApplicationId.set(application.id);
  }

  private toDatetimeLocalValue(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const offsetMs = date.getTimezoneOffset() * 60_000;
    return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
  }

  cancelStatusChange(): void {
    const pending = this.pendingStatusChange();
    if (pending?.selectElement) {
      pending.selectElement.value = pending.application.status;
    }
    this.pendingStatusChange.set(null);
    this.statusChangeError.set(null);
  }

  confirmStatusChange(): void {
    const pending = this.pendingStatusChange();
    if (!pending) return;

    const interviewAtLocal = this.statusChangeForm.controls.interviewAt.value;
    if (pending.targetStatus === 'interview' && !interviewAtLocal) {
      this.statusChangeError.set('Choisissez la date et l’heure de l’entretien.');
      return;
    }
    if (pending.targetStatus === 'interview') {
      const interviewDate = new Date(interviewAtLocal);
      if (Number.isNaN(interviewDate.getTime())) {
        this.statusChangeError.set('Date d’entretien invalide.');
        return;
      }
      if (interviewDate.getTime() <= Date.now()) {
        this.statusChangeError.set('La date d’entretien doit être dans le futur.');
        return;
      }
    }

    const interviewAt =
      pending.targetStatus === 'interview' ? new Date(interviewAtLocal).toISOString() : undefined;
    const evaluationText = this.statusChangeForm.controls.evaluationText.value.trim() || undefined;
    const internalNote = this.statusChangeForm.controls.internalNote.value.trim() || undefined;

    this.pendingStatusChange.set(null);
    this.updateStatus(pending.application.id, pending.targetStatus, pending.application.rating, {
      evaluationText,
      internalNote,
      interviewAt,
    });
  }

  statusChangeMessage(app: Application, newStatus: ApplicationStatus): string {
    return `${this.candidateName(app)} : « ${this.statusLabels[app.status]} » → « ${this.statusLabels[newStatus]} »`;
  }

  canMoveToStatus(currentStatus: ApplicationStatus, targetStatus: ApplicationStatus): boolean {
    return ALLOWED_STATUS_TRANSITIONS[currentStatus]?.has(targetStatus) ?? false;
  }

  stageColumnsFor(currentStatus: ApplicationStatus): { status: ApplicationStatus; label: string }[] {
    return this.statusOptions.filter((column) => this.canMoveToStatus(currentStatus, column.status));
  }

  goToNotesPage(page: number): void {
    const totalPages = this.notesTotalPages();
    if (page < 1 || page > totalPages) return;
    this.notesPage.set(page);
  }

  updateStatus(
    applicationId: string,
    status: ApplicationStatus,
    rating: number | null,
    options: { evaluationText?: string; internalNote?: string; interviewAt?: string } = {}
  ): void {
    this.saving.set(true);
    this.errorMessage.set(null);
    const candidateMessage =
      options.evaluationText !== undefined
        ? options.evaluationText.trim() || undefined
        : undefined;
    const internalNote = options.internalNote?.trim() || undefined;

    this.applicationService
      .updateStatus(applicationId, {
        status,
        rating: rating ?? undefined,
        evaluationText: candidateMessage,
        internalNote,
        interviewAt: options.interviewAt,
      })
      .subscribe({
        next: (res) => {
          const archived = status === 'rejected';
          this.successMessage.set(
            archived
              ? 'Candidature rejetée et déplacée dans Archives.'
              : candidateMessage
              ? res.meta?.emailSent
                ? 'Candidature mise à jour — message envoyé par e-mail au candidat.'
                : 'Candidature mise à jour — message enregistré, e-mail non envoyé.'
              : 'Candidature mise à jour.'
          );
          if (candidateMessage) {
            this.noteForm.controls.evaluationText.reset();
          }
          this.saving.set(false);
          if (archived) {
            this.closePanel();
          }
          this.loadApplications(this.currentPage());
          if (this.selectedApplication()?.id === applicationId) {
            this.applicationService.getById(applicationId).subscribe({
              next: (res) => {
                if (res.data) {
                  this.selectedApplication.set(res.data);
                  this.notesPage.set(1);
                }
              },
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
      message: `Enregistrer cette note interne pour ${this.candidateName(selected)} ?`,
      confirmLabel: 'Enregistrer',
    });
    if (!ok) return;

    this.saving.set(true);
    this.applicationService
      .addNote(selected.id, this.noteForm.controls.noteText.value)
      .subscribe({
        next: () => {
          this.successMessage.set('Note interne enregistrée.');
          this.noteForm.controls.noteText.reset();
          this.saving.set(false);
          this.applicationService.getById(selected.id).subscribe({
            next: (res) => {
              if (res.data) {
                this.selectedApplication.set(res.data);
                this.notesPage.set(1);
              }
            },
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
