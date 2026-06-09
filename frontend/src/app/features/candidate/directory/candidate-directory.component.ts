import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { APP_ROUTES } from '../../../core/constants/routes.constant';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { Job } from '../../../core/models/job.model';
import {
  InstitutionOfferingItem,
  PrivateInstitutionCard,
  PrivateInstitutionDetail,
  TrainingCenterCard,
  TrainingCenterDetail,
  TrainingEventItem,
  TrainingFormationItem,
} from '../../../core/models/catalog.model';
import { resolveUploadUrl } from '../../../core/utils/asset-url.util';
import { remoteLabel, salaryDisplayLabel } from '../../../core/utils/job-display.util';
import { SafeHtmlComponent } from '../../../shared/components/safe-html/safe-html.component';
import { CandidateJobService } from '../services/candidate-job.service';
import { CandidateApplicationsService } from '../services/candidate-applications.service';
import { PublicCatalogService } from '../../public/services/public-catalog.service';
import {
  deliveryModeLabel,
  institutionTypeLabel,
  TRAINING_DELIVERY_OPTIONS,
  INSTITUTION_TYPE_OPTIONS,
} from '../../public/shared/catalog.constants';

type DirectoryKind = 'companies' | 'training' | 'institutions';

interface CompanyDirectoryCard {
  id: string;
  name: string;
  logoUrl: string | null;
  industry: string | null;
  city: string | null;
  website: string | null;
  description: string | null;
  cities: string[];
  jobs: Job[];
  jobsCount: number;
}

type TrainingContent = TrainingFormationItem | TrainingEventItem;

@Component({
  selector: 'app-candidate-directory',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, SafeHtmlComponent],
  templateUrl: './candidate-directory.component.html',
  styleUrl: './candidate-directory.component.css',
})
export class CandidateDirectoryComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly jobs = inject(CandidateJobService);
  private readonly applications = inject(CandidateApplicationsService);
  private readonly catalog = inject(PublicCatalogService);

  readonly routes = APP_ROUTES;
  readonly deliveryOptions = TRAINING_DELIVERY_OPTIONS;
  readonly institutionTypes = INSTITUTION_TYPE_OPTIONS;

  readonly kind = signal<DirectoryKind>('companies');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly companies = signal<CompanyDirectoryCard[]>([]);
  readonly trainingCenters = signal<TrainingCenterCard[]>([]);
  readonly institutions = signal<PrivateInstitutionCard[]>([]);
  readonly total = signal(0);
  readonly detailLoading = signal(false);
  readonly selectedCompany = signal<CompanyDirectoryCard | null>(null);
  readonly selectedJob = signal<Job | null>(null);
  readonly selectedTrainingCenter = signal<TrainingCenterDetail | null>(null);
  readonly selectedTrainingContent = signal<TrainingContent | null>(null);
  readonly selectedInstitution = signal<PrivateInstitutionDetail | null>(null);
  readonly selectedOffering = signal<InstitutionOfferingItem | null>(null);
  readonly detailMode = signal(false);
  readonly jobPopupOpen = signal(false);
  readonly jobPopupLoading = signal(false);
  readonly jobPopup = signal<Job | null>(null);
  readonly applyOpen = signal(false);
  readonly applying = signal(false);
  readonly generatingLetter = signal(false);
  readonly appliedJobIds = signal<Set<string>>(new Set());
  readonly trainingPopupOpen = signal(false);
  readonly trainingPopup = signal<TrainingContent | null>(null);
  readonly trainingActionLoading = signal(false);
  readonly trainingActionMsg = signal<string | null>(null);
  readonly institutionPopupOpen = signal(false);
  readonly institutionPopup = signal<InstitutionOfferingItem | null>(null);
  readonly institutionActionLoading = signal(false);
  readonly institutionActionMsg = signal<string | null>(null);
  readonly success = signal<string | null>(null);

  readonly applyForm = this.fb.nonNullable.group({
    coverLetter: [''],
  });

  search = '';
  city = '';
  domain = '';
  deliveryMode = '';
  institutionType = '';

  readonly title = computed(() => {
    switch (this.kind()) {
      case 'training':
        return 'Annuaire formations';
      case 'institutions':
        return 'Annuaire établissements';
      default:
        return 'Annuaire sociétés';
    }
  });

  readonly subtitle = computed(() => {
    switch (this.kind()) {
      case 'training':
        return 'Consultez les centres de formation validés et leurs domaines.';
      case 'institutions':
        return 'Explorez les établissements privés référencés.';
      default:
        return 'Découvrez les sociétés qui publient des offres actives.';
    }
  });

  readonly hasDetailView = computed(
    () =>
      this.detailMode() ||
      !!this.selectedCompany() ||
      !!this.selectedTrainingCenter() ||
      !!this.selectedInstitution()
  );

  ngOnInit(): void {
    this.route.data.subscribe((data) => {
      this.kind.set((data['directory'] as DirectoryKind) || 'companies');
      this.resetFilters(false);
      this.load();
    });
    this.applications.listAppliedJobIds().subscribe({
      next: (res) => this.appliedJobIds.set(new Set(res.data ?? [])),
    });
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.clearSelection();

    if (this.kind() === 'training') {
      const params: Record<string, string> = { page: '1', limit: '24' };
      if (this.search.trim()) params['search'] = this.search.trim();
      if (this.city.trim()) params['city'] = this.city.trim();
      if (this.domain.trim()) params['domain'] = this.domain.trim();
      if (this.deliveryMode) params['deliveryMode'] = this.deliveryMode;

      this.catalog.listTrainingCenters(params).subscribe({
        next: (res) => {
          this.trainingCenters.set(res.data ?? []);
          this.total.set(res.pagination?.totalItems ?? this.trainingCenters().length);
          this.loading.set(false);
        },
        error: () => this.fail('Impossible de charger l’annuaire des formations.'),
      });
      return;
    }

    if (this.kind() === 'institutions') {
      const params: Record<string, string> = { page: '1', limit: '24' };
      if (this.search.trim()) params['search'] = this.search.trim();
      if (this.city.trim()) params['city'] = this.city.trim();
      if (this.institutionType) params['type'] = this.institutionType;

      this.catalog.listPrivateInstitutions(params).subscribe({
        next: (res) => {
          this.institutions.set(res.data ?? []);
          this.total.set(res.pagination?.totalItems ?? this.institutions().length);
          this.loading.set(false);
        },
        error: () => this.fail('Impossible de charger l’annuaire des établissements.'),
      });
      return;
    }

    this.jobs.search({ limit: 50, sortBy: 'date' }).subscribe({
      next: (res) => {
        const cards = this.buildCompanyCards(res.data ?? []);
        const query = this.search.trim().toLowerCase();
        const city = this.city.trim().toLowerCase();
        const domain = this.domain.trim().toLowerCase();
        const filtered = cards.filter((c) => {
          const searchable = `${c.name} ${c.industry || ''} ${c.cities.join(' ')}`.toLowerCase();
          if (query && !searchable.includes(query)) return false;
          if (city && !c.cities.some((item) => item.toLowerCase().includes(city))) return false;
          if (domain && !(c.industry || '').toLowerCase().includes(domain)) return false;
          return true;
        });
        this.companies.set(filtered);
        this.total.set(filtered.length);
        this.loading.set(false);
      },
      error: () => this.fail('Impossible de charger l’annuaire des sociétés.'),
    });
  }

  resetFilters(reload = true): void {
    this.search = '';
    this.city = '';
    this.domain = '';
    this.deliveryMode = '';
    this.institutionType = '';
    if (reload) this.load();
  }

  logoUrl(url: string | null): string | null {
    return resolveUploadUrl(url);
  }

  companyLogo(job: Job): string | null {
    return resolveUploadUrl(job.company?.logoUrl ?? null);
  }

  selectCompany(company: CompanyDirectoryCard): void {
    this.detailMode.set(true);
    this.selectedCompany.set(company);
    this.selectedJob.set(company.jobs[0] ?? null);
    this.selectedTrainingCenter.set(null);
    this.selectedTrainingContent.set(null);
    this.selectedInstitution.set(null);
    this.selectedOffering.set(null);
  }

  selectJob(job: Job, event?: Event): void {
    event?.stopPropagation();
    this.selectedJob.set(job);
    this.openJobPopup(job);
  }

  openJobPopup(job: Job): void {
    this.error.set(null);
    this.success.set(null);
    this.jobPopup.set(job);
    this.jobPopupOpen.set(true);
    this.jobPopupLoading.set(true);
    this.jobs.getById(job.id).subscribe({
      next: (res) => {
        if (res.data) {
          this.jobPopup.set(res.data);
          this.selectedJob.set(res.data);
        }
        this.jobPopupLoading.set(false);
      },
      error: () => {
        this.jobPopupLoading.set(false);
      },
    });
  }

  closeJobPopup(): void {
    this.jobPopupOpen.set(false);
    this.jobPopupLoading.set(false);
    this.applyOpen.set(false);
    this.applyForm.reset({ coverLetter: '' });
  }

  startApply(job: Job): void {
    this.error.set(null);
    this.success.set(null);
    if (this.hasApplied(job.id)) {
      this.error.set('Vous avez déjà postulé à cette offre.');
      return;
    }
    this.applyOpen.set(true);
    this.applyForm.reset({ coverLetter: '' });
  }

  cancelApply(): void {
    this.applyOpen.set(false);
    this.applyForm.reset({ coverLetter: '' });
  }

  generateLetter(): void {
    const job = this.jobPopup();
    if (!job) return;
    this.generatingLetter.set(true);
    this.jobs.generateLetter(job.id).subscribe({
      next: (res) => {
        if (res.data?.fullText) {
          this.applyForm.patchValue({ coverLetter: res.data.fullText });
        }
        this.generatingLetter.set(false);
      },
      error: () => {
        this.error.set('Impossible de générer la lettre pour le moment.');
        this.generatingLetter.set(false);
      },
    });
  }

  async submitApplication(): Promise<void> {
    const job = this.jobPopup();
    if (!job || this.applying()) return;

    const confirmed = await this.confirmDialog.confirm({
      title: 'Confirmer la candidature',
      message: `Voulez-vous envoyer votre candidature pour "${job.title}" ?`,
      confirmLabel: 'Envoyer ma candidature',
      cancelLabel: 'Annuler',
    });
    if (!confirmed) return;

    this.applying.set(true);
    this.error.set(null);
    this.success.set(null);

    const coverLetter = this.applyForm.controls.coverLetter.value.trim();
    this.jobs.apply(job.id, coverLetter ? { coverLetter } : {}).subscribe({
      next: () => {
        this.appliedJobIds.update((ids) => new Set(ids).add(job.id));
        this.success.set('Candidature envoyée avec succès.');
        this.applyOpen.set(false);
        this.applyForm.reset({ coverLetter: '' });
        this.applying.set(false);
      },
      error: (err: HttpErrorResponse) => {
        if (err.status === 409) {
          this.appliedJobIds.update((ids) => new Set(ids).add(job.id));
          this.error.set('Vous avez déjà postulé à cette offre.');
        } else {
          this.error.set(this.extractApiError(err) || 'Échec de l’envoi de la candidature.');
        }
        this.applying.set(false);
      },
    });
  }

  selectTrainingCenter(center: TrainingCenterCard): void {
    this.detailMode.set(true);
    this.detailLoading.set(true);
    this.clearSelection(true);
    this.catalog.getTrainingCenter(center.id).subscribe({
      next: (res) => {
        const detail = res.data;
        if (!detail) {
          this.fail('Centre introuvable.');
          this.detailLoading.set(false);
          return;
        }
        this.selectedTrainingCenter.set(detail);
        this.selectedTrainingContent.set(detail.formations?.[0] ?? detail.events?.[0] ?? null);
        this.detailLoading.set(false);
      },
      error: () => {
        this.fail('Impossible de charger les détails du centre.');
        this.detailLoading.set(false);
      },
    });
  }

  selectTrainingContent(content: TrainingContent, event?: Event): void {
    event?.stopPropagation();
    this.selectedTrainingContent.set(content);
    this.trainingPopup.set(content);
    this.trainingPopupOpen.set(true);
    this.trainingActionMsg.set(null);
  }

  closeTrainingPopup(): void {
    this.trainingPopupOpen.set(false);
    this.trainingPopup.set(null);
    this.trainingActionLoading.set(false);
    this.trainingActionMsg.set(null);
  }

  async registerTrainingContent(content: TrainingContent): Promise<void> {
    if (content.participationType || this.trainingActionLoading()) return;

    const kindLabel = this.isEvent(content) ? 'cet événement' : 'cette formation';
    const confirmed = await this.confirmDialog.confirm({
      title: 'Confirmer l’inscription',
      message: `Voulez-vous vous inscrire à ${kindLabel} : "${content.title}" ?`,
      confirmLabel: 'Confirmer',
      cancelLabel: 'Annuler',
    });
    if (!confirmed) return;

    this.trainingActionLoading.set(true);
    this.trainingActionMsg.set(null);
    const request = this.isEvent(content)
      ? this.catalog.participateEvent(content.id)
      : this.catalog.participateFormation(content.id);

    request.subscribe({
      next: () => {
        this.trainingActionLoading.set(false);
        this.trainingActionMsg.set('Inscription enregistrée.');
        this.markTrainingContentRegistered(content.id);
      },
      error: (err) => {
        this.trainingActionLoading.set(false);
        this.trainingActionMsg.set(err.error?.message ?? 'Inscription impossible.');
      },
    });
  }

  selectInstitution(institution: PrivateInstitutionCard): void {
    this.detailMode.set(true);
    this.detailLoading.set(true);
    this.clearSelection(true);
    this.catalog.getPrivateInstitution(institution.id).subscribe({
      next: (res) => {
        const detail = res.data;
        if (!detail) {
          this.fail('Établissement introuvable.');
          this.detailLoading.set(false);
          return;
        }
        this.selectedInstitution.set(detail);
        this.selectedOffering.set(this.institutionOfferings(detail)[0] ?? null);
        this.detailLoading.set(false);
      },
      error: () => {
        this.fail('Impossible de charger les détails de l’établissement.');
        this.detailLoading.set(false);
      },
    });
  }

  selectOffering(offering: InstitutionOfferingItem, event?: Event): void {
    event?.stopPropagation();
    this.selectedOffering.set(offering);
    this.institutionPopup.set(offering);
    this.institutionPopupOpen.set(true);
    this.institutionActionMsg.set(null);
  }

  closeInstitutionPopup(): void {
    this.institutionPopupOpen.set(false);
    this.institutionPopup.set(null);
    this.institutionActionLoading.set(false);
    this.institutionActionMsg.set(null);
  }

  async registerInstitutionOffering(offering: InstitutionOfferingItem): Promise<void> {
    if (offering.participationType || this.institutionActionLoading()) return;

    const confirmed = await this.confirmDialog.confirm({
      title: this.institutionActionTitle(offering),
      message: `Confirmer votre action pour "${offering.title}" ?`,
      confirmLabel: this.institutionActionLabel(offering),
      cancelLabel: 'Annuler',
    });
    if (!confirmed) return;

    this.institutionActionLoading.set(true);
    this.institutionActionMsg.set(null);
    this.catalog.participateInstitutionOffering(offering.id).subscribe({
      next: () => {
        this.institutionActionLoading.set(false);
        this.institutionActionMsg.set(this.institutionSuccessLabel(offering));
        this.markInstitutionOfferingRegistered(offering.id);
      },
      error: (err) => {
        this.institutionActionLoading.set(false);
        this.institutionActionMsg.set(err.error?.message ?? 'Action impossible.');
      },
    });
  }

  deliveryLabel(mode: TrainingCenterCard['deliveryMode']): string {
    return deliveryModeLabel(mode);
  }

  institutionLabel(type: PrivateInstitutionCard['institutionType']): string {
    return institutionTypeLabel(type);
  }

  trainingContents(center: TrainingCenterDetail | null): TrainingContent[] {
    if (!center) return [];
    return [...(center.formations ?? []), ...(center.events ?? [])];
  }

  institutionOfferings(institution: PrivateInstitutionDetail | null): InstitutionOfferingItem[] {
    if (!institution) return [];
    return [
      ...(institution.publishedPrograms ?? []),
      ...(institution.publishedEvents ?? []),
      ...(institution.publishedAnnouncements ?? []),
      ...(institution.publishedOpportunities ?? []),
      ...(institution.institutionOfferings ?? []),
    ].filter((item, index, items) => items.findIndex((other) => other.id === item.id) === index);
  }

  isEvent(content: TrainingContent): content is TrainingEventItem {
    return 'eventType' in content;
  }

  contentKind(content: TrainingContent): string {
    return this.isEvent(content) ? 'Événement' : 'Formation';
  }

  contentDate(content: TrainingContent): string | null | undefined {
    return this.isEvent(content) ? content.eventDate : content.startDate;
  }

  contentSummary(content: TrainingContent): string {
    return this.isEvent(content)
      ? this.textPreview(content.description, 320)
      : this.textPreview(content.description || content.shortDescription, 320);
  }

  contentDescription(content: TrainingContent): string {
    return this.isEvent(content)
      ? content.description || 'Aucune description disponible.'
      : content.description || content.shortDescription || 'Aucune description disponible.';
  }

  formationDuration(content: TrainingContent): string | null {
    return this.isEvent(content) ? null : content.durationLabel ?? null;
  }

  contentPrice(content: TrainingContent): string | null {
    if (content.price == null || Number.isNaN(content.price)) return null;
    return `${Number(content.price).toLocaleString('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })} TND`;
  }

  contentImage(content: TrainingContent): string | null {
    return this.isEvent(content)
      ? resolveUploadUrl(content.posterImageUrl ?? null)
      : resolveUploadUrl(content.mainImageUrl ?? null);
  }

  hasTrainingParticipation(content: TrainingContent): boolean {
    return Boolean(content.participationType);
  }

  offeringKind(offering: InstitutionOfferingItem): string {
    const labels: Record<InstitutionOfferingItem['offeringType'], string> = {
      program: 'Programme',
      event: 'Événement',
      announcement: 'Annonce',
      opportunity: 'Opportunité',
    };
    return labels[offering.offeringType] ?? offering.offeringType;
  }

  institutionActionLabel(offering: InstitutionOfferingItem): string {
    if (offering.offeringType === 'opportunity') return 'Candidater';
    if (offering.offeringType === 'announcement') return 'Je suis intéressé';
    return "S'inscrire";
  }

  institutionActionTitle(offering: InstitutionOfferingItem): string {
    if (offering.offeringType === 'opportunity') return 'Confirmer la candidature';
    if (offering.offeringType === 'announcement') return 'Confirmer votre intérêt';
    return 'Confirmer l’inscription';
  }

  institutionSuccessLabel(offering: InstitutionOfferingItem): string {
    if (offering.offeringType === 'opportunity') return 'Candidature enregistrée.';
    if (offering.offeringType === 'announcement') return 'Intérêt enregistré.';
    return 'Inscription enregistrée.';
  }

  institutionDoneLabel(offering: InstitutionOfferingItem): string {
    if (offering.offeringType === 'opportunity') return 'Candidature envoyée';
    if (offering.offeringType === 'announcement') return 'Déjà intéressé';
    return 'Déjà inscrit';
  }

  offeringDate(offering: InstitutionOfferingItem): string {
    const start = offering.startDate ? this.formatDate(offering.startDate) : '';
    const end = offering.endDate ? this.formatDate(offering.endDate) : '';
    if (start && end && start !== end) return `${start} - ${end}`;
    return start || end || 'Date non précisée';
  }

  hasInstitutionParticipation(offering: InstitutionOfferingItem): boolean {
    return Boolean(offering.participationType);
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return 'Date non précisée';
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value));
  }

  formatRemote(type: string | undefined): string {
    return remoteLabel(type);
  }

  formatSalary(job: Job): string | null {
    return salaryDisplayLabel(job);
  }

  hasApplied(jobId: string): boolean {
    return this.appliedJobIds().has(jobId);
  }

  backToDirectory(): void {
    this.clearSelection(false);
  }

  textPreview(value: string | null | undefined, max = 180): string {
    if (!value) return '';
    const text = value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return text.length > max ? `${text.slice(0, max).trim()}...` : text;
  }

  companyTags(company: CompanyDirectoryCard): string[] {
    return Array.from(
      new Set(company.jobs.flatMap((job) => job.tags ?? []).filter(Boolean))
    ).slice(0, 8);
  }

  private buildCompanyCards(jobs: Job[]): CompanyDirectoryCard[] {
    const map = new Map<string, CompanyDirectoryCard>();
    for (const job of jobs) {
      const company = job.company;
      if (!company?.id || !company.name) continue;
      const existing = map.get(company.id);
      if (existing) {
        existing.jobsCount += 1;
        existing.jobs.push(job);
        const location = this.cleanLocation(job.location);
        if (location && !existing.cities.includes(location)) {
          existing.cities.push(location);
        }
      } else {
        const companyCity = this.cleanLocation(company.city ?? null);
        const location = this.cleanLocation(job.location);
        const cities = [companyCity, location].filter((item): item is string => Boolean(item));
        map.set(company.id, {
          id: company.id,
          name: company.name,
          logoUrl: company.logoUrl,
          industry: company.industry ?? null,
          city: companyCity,
          website: company.website ?? null,
          description: company.description ?? null,
          cities: Array.from(new Set(cities)),
          jobs: [job],
          jobsCount: 1,
        });
      }
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  private cleanLocation(location: string | null): string | null {
    const value = location?.trim();
    return value || null;
  }

  private clearSelection(keepDetailMode = false): void {
    this.selectedCompany.set(null);
    this.selectedJob.set(null);
    this.selectedTrainingCenter.set(null);
    this.selectedTrainingContent.set(null);
    this.selectedInstitution.set(null);
    this.selectedOffering.set(null);
    this.detailLoading.set(false);
    this.detailMode.set(keepDetailMode);
    this.closeJobPopup();
    this.closeTrainingPopup();
    this.closeInstitutionPopup();
  }

  private fail(message: string): void {
    this.error.set(message);
    this.loading.set(false);
  }

  private markTrainingContentRegistered(contentId: string): void {
    const mark = <T extends TrainingContent>(item: T): T =>
      item.id === contentId
        ? {
            ...item,
            participationType: 'registered',
            participantsCount: (item.participantsCount ?? 0) + 1,
          }
        : item;

    this.trainingPopup.update((item) => (item ? mark(item) : item));
    this.selectedTrainingContent.update((item) => (item ? mark(item) : item));
    this.selectedTrainingCenter.update((center) => {
      if (!center) return center;
      return {
        ...center,
        formations: center.formations?.map((item) => mark(item)) ?? [],
        events: center.events?.map((item) => mark(item)) ?? [],
      };
    });
  }

  private markInstitutionOfferingRegistered(offeringId: string): void {
    const mark = (item: InstitutionOfferingItem): InstitutionOfferingItem =>
      item.id === offeringId
        ? {
            ...item,
            participationType: 'registered',
            registrationsCount: (item.registrationsCount ?? 0) + 1,
          }
        : item;

    this.institutionPopup.update((item) => (item ? mark(item) : item));
    this.selectedOffering.update((item) => (item ? mark(item) : item));
    this.selectedInstitution.update((institution) => {
      if (!institution) return institution;
      const mapList = (items?: InstitutionOfferingItem[]) => items?.map((item) => mark(item)) ?? [];
      return {
        ...institution,
        institutionOfferings: mapList(institution.institutionOfferings),
        publishedPrograms: mapList(institution.publishedPrograms),
        publishedEvents: mapList(institution.publishedEvents),
        publishedAnnouncements: mapList(institution.publishedAnnouncements),
        publishedOpportunities: mapList(institution.publishedOpportunities),
      };
    });
  }

  private extractApiError(err: HttpErrorResponse): string | null {
    const body = err.error as { message?: string; error?: string } | string | null;
    if (typeof body === 'string') return body;
    return body?.message || body?.error || null;
  }
}
