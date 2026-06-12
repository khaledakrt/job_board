import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProviderService } from '../services/provider.service';
import { RichTextEditorComponent } from '../../../shared/components/rich-text-editor/rich-text-editor.component';
import { sanitizeRichHtml } from '../../../shared/utils/rich-text.util';
import {
  InstitutionOfferingItem,
  InstitutionOfferingStatus,
  InstitutionOfferingType,
} from '../../../core/models/catalog.model';
import { PaginationMeta } from '../../../core/models/pagination.model';

const LABELS: Record<
  InstitutionOfferingType,
  {
    plural: string;
    singular: string;
    subtitle: string;
    titleLabel: string;
    titlePlaceholder: string;
    categoryLabel: string;
    summaryLabel: string;
    summaryPlaceholder: string;
    descriptionLabel: string;
    descriptionPlaceholder: string;
    dateStartLabel: string;
    dateEndLabel: string;
    seatsLabel: string;
  }
> = {
  program: {
    plural: 'Programmes',
    singular: 'programme',
    subtitle: 'Présentez vos cursus avec des informations claires pour les candidats et parents.',
    titleLabel: 'Nom du programme',
    titlePlaceholder: 'Ex. Licence en informatique appliquée',
    categoryLabel: 'Niveau / filière',
    summaryLabel: 'Résumé court',
    summaryPlaceholder: 'Ex. Formation professionnalisante en 3 ans, orientée développement logiciel.',
    descriptionLabel: 'Description détaillée du programme',
    descriptionPlaceholder: 'Ajoutez objectifs, prérequis, durée, débouchés et liens utiles.',
    dateStartLabel: 'Début des inscriptions',
    dateEndLabel: 'Fin des inscriptions',
    seatsLabel: 'Capacité / places disponibles',
  },
  event: {
    plural: 'Événements',
    singular: 'événement',
    subtitle: 'Publiez vos journées portes ouvertes, conférences, workshops et rencontres.',
    titleLabel: 'Nom de l’événement',
    titlePlaceholder: 'Ex. Journée portes ouvertes 2026',
    categoryLabel: 'Thématique',
    summaryLabel: 'Résumé événement',
    summaryPlaceholder: 'Ex. Découvrez le campus, les filières et les conditions d’admission.',
    descriptionLabel: 'Programme et informations pratiques',
    descriptionPlaceholder: 'Ajoutez programme, intervenants, lieu, lien d’inscription et contacts.',
    dateStartLabel: 'Date de début',
    dateEndLabel: 'Date de fin',
    seatsLabel: 'Nombre de places',
  },
  announcement: {
    plural: 'Actualités & annonces',
    singular: 'annonce',
    subtitle: 'Communiquez vos nouveautés, admissions, résultats et informations importantes.',
    titleLabel: 'Titre de l’annonce',
    titlePlaceholder: 'Ex. Ouverture des inscriptions 2026',
    categoryLabel: 'Rubrique',
    summaryLabel: 'Résumé de l’annonce',
    summaryPlaceholder: 'Ex. Les candidatures sont ouvertes jusqu’au 30 juin.',
    descriptionLabel: 'Contenu de l’annonce',
    descriptionPlaceholder: 'Ajoutez les détails, dates importantes, liens et documents utiles.',
    dateStartLabel: 'Date de publication',
    dateEndLabel: 'Date d’expiration',
    seatsLabel: 'Places concernées',
  },
};

@Component({
  selector: 'app-institution-offerings',
  standalone: true,
  imports: [FormsModule, RichTextEditorComponent],
  templateUrl: './institution-offerings.component.html',
  styleUrls: ['../shared/provider-theme.css', './institution-offerings.component.css'],
})
export class InstitutionOfferingsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly providerService = inject(ProviderService);

  readonly type = signal<InstitutionOfferingType>('program');
  readonly items = signal<InstitutionOfferingItem[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly editingId = signal<string | null>(null);
  readonly editingOriginalStatus = signal<InstitutionOfferingStatus | null>(null);
  readonly saving = signal(false);
  readonly confirmOpen = signal(false);
  readonly confirmMode = signal<'save' | 'delete'>('save');
  readonly pendingDelete = signal<InstitutionOfferingItem | null>(null);
  readonly page = signal(1);
  readonly pagination = signal<PaginationMeta | null>(null);
  readonly pageSize = 10;

  search = '';
  statusFilter = '';

  title = '';
  summary = '';
  description = '';
  category = '';
  eventType = 'open_day';
  startDate = '';
  endDate = '';
  city = '';
  address = '';
  seats: number | null = null;
  phone = '';
  email = '';
  website = '';
  status: 'draft' | 'pending' = 'draft';

  readonly labels = computed(() => LABELS[this.type()]);
  readonly formTitle = computed(() =>
    this.editingId() ? `Modifier ce ${this.labels().singular}` : `Ajouter un ${this.labels().singular}`
  );
  readonly pageItems = computed(() => this.items());
  readonly totalItems = computed(() => this.pagination()?.totalItems ?? this.items().length);
  readonly totalPages = computed(() => this.pagination()?.totalPages ?? 1);

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.loadForEdit(id);
        return;
      }
      const routeType = this.route.snapshot.data['offeringType'] as InstitutionOfferingType | undefined;
      this.type.set(routeType ?? 'program');
      this.resetForm();
      this.load();
    });
  }

  private loadForEdit(id: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.providerService.getInstitutionOffering(id).subscribe({
      next: (res) => {
        const item = res.data;
        if (!item) {
          this.error.set('Publication introuvable.');
          this.loading.set(false);
          return;
        }
        this.type.set(item.offeringType);
        this.edit(item);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Publication introuvable.');
        this.loading.set(false);
      },
    });
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.providerService.listInstitutionOfferings({
      type: this.type(),
      status: this.statusFilter || undefined,
      search: this.search.trim() || undefined,
      page: this.page(),
      limit: this.pageSize,
    }).subscribe({
      next: (res) => {
        this.items.set(res.data ?? []);
        this.pagination.set(res.pagination ?? null);
        this.loading.set(false);
      },
      error: () => {
        this.items.set([]);
        this.pagination.set(null);
        this.error.set('Impossible de charger vos publications.');
        this.loading.set(false);
      },
    });
  }

  onFilterChange(): void {
    this.page.set(1);
    this.load();
  }

  setPage(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.page() || this.loading()) return;
    this.page.set(page);
    this.load();
  }

  statusLabel(status: InstitutionOfferingStatus): string {
    const map: Record<InstitutionOfferingStatus, string> = {
      draft: 'Brouillon',
      pending: 'En attente',
      published: 'Publié',
      rejected: 'Refusé',
    };
    return map[status];
  }

  statusClass(status: InstitutionOfferingStatus): string {
    if (status === 'published') return 'provider-pill provider-pill--ok';
    if (status === 'rejected') return 'provider-pill provider-pill--danger';
    if (status === 'pending') return 'provider-pill provider-pill--warn';
    return 'provider-pill';
  }

  edit(item: InstitutionOfferingItem): void {
    this.editingId.set(item.id);
    this.editingOriginalStatus.set(item.status);
    this.title = item.title;
    this.summary = item.summary ?? '';
    this.description = item.description ?? '';
    this.category = item.category ?? '';
    this.eventType = item.eventType ?? 'open_day';
    this.startDate = item.startDate ? String(item.startDate).slice(0, 10) : '';
    this.endDate = item.endDate ? String(item.endDate).slice(0, 10) : '';
    this.city = item.city ?? '';
    this.address = item.address ?? '';
    this.seats = item.seats ?? null;
    this.phone = item.phone ?? '';
    this.email = item.email ?? '';
    this.website = item.website ?? '';
    this.status = item.status === 'draft' ? 'draft' : 'pending';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  resetForm(): void {
    this.editingId.set(null);
    this.editingOriginalStatus.set(null);
    this.title = '';
    this.summary = '';
    this.description = '';
    this.category = '';
    this.eventType = 'open_day';
    this.startDate = '';
    this.endDate = '';
    this.city = '';
    this.address = '';
    this.seats = null;
    this.phone = '';
    this.email = '';
    this.website = '';
    this.status = 'draft';
    this.pendingDelete.set(null);
    this.confirmOpen.set(false);
  }

  save(): void {
    this.error.set(null);
    this.success.set(null);
    if (!this.title.trim()) {
      this.error.set('Le titre est obligatoire.');
      return;
    }
    if (this.summary.trim().length < 10) {
      this.error.set('Le résumé doit contenir au moins 10 caractères.');
      return;
    }
    this.confirmMode.set('save');
    this.confirmOpen.set(true);
  }

  closeConfirm(): void {
    if (this.saving()) return;
    this.confirmOpen.set(false);
    this.pendingDelete.set(null);
  }

  confirmTitle(): string {
    if (this.confirmMode() === 'delete') return 'Confirmer la suppression';
    return this.status === 'pending' ? 'Envoyer en validation' : 'Enregistrer le brouillon';
  }

  confirmMessage(): string {
    if (this.confirmMode() === 'delete') {
      const item = this.pendingDelete();
      return `Le contenu « ${item?.title ?? ''} » sera supprimé définitivement.`;
    }
    if (this.status === 'pending') {
      return 'Ce contenu sera transmis à l’administrateur. Il deviendra visible après validation.';
    }
    return 'Ce contenu restera en brouillon et ne sera pas visible sur le site public.';
  }

  confirmAction(): void {
    if (this.confirmMode() === 'delete') {
      this.confirmDelete();
      return;
    }
    this.confirmSave();
  }

  confirmSave(): void {
    const body: Partial<InstitutionOfferingItem> = {
      title: this.title.trim(),
      summary: this.summary.trim() || null,
      description: sanitizeRichHtml(this.description).trim() || null,
      category: this.category.trim() || null,
      eventType: this.type() === 'event' ? (this.eventType as InstitutionOfferingItem['eventType']) : null,
      startDate: this.startDate || null,
      endDate: this.endDate || null,
      city: this.city.trim() || null,
      address: this.address.trim() || null,
      seats: this.seats,
      phone: this.phone.trim() || null,
      email: this.email.trim() || null,
      website: this.website.trim() || null,
      status: this.status,
    };
    const id = this.editingId();
    const req = id
      ? this.providerService.updateInstitutionOffering(id, body)
      : this.providerService.createInstitutionOffering(this.type(), body);
    this.saving.set(true);
    req.subscribe({
      next: () => {
        this.success.set(
          this.status === 'pending'
            ? 'Contenu enregistré et envoyé en validation administrateur.'
            : 'Brouillon enregistré.'
        );
        this.confirmOpen.set(false);
        this.saving.set(false);
        this.resetForm();
        this.page.set(1);
        this.load();
        setTimeout(() => this.success.set(null), 3500);
      },
      error: (err) => {
        this.error.set(err.error?.message ?? 'Enregistrement impossible.');
        this.saving.set(false);
        this.confirmOpen.set(false);
      },
    });
  }

  remove(item: InstitutionOfferingItem): void {
    this.pendingDelete.set(item);
    this.confirmMode.set('delete');
    this.confirmOpen.set(true);
  }

  private confirmDelete(): void {
    const item = this.pendingDelete();
    if (!item) return;
    this.saving.set(true);
    this.providerService.deleteInstitutionOffering(item.id).subscribe({
      next: () => {
        this.success.set('Contenu supprimé.');
        this.saving.set(false);
        this.confirmOpen.set(false);
        this.pendingDelete.set(null);
        if (this.pageItems().length <= 1 && this.page() > 1) {
          this.page.set(this.page() - 1);
        }
        this.load();
        setTimeout(() => this.success.set(null), 2500);
      },
      error: (err) => {
        this.error.set(err.error?.message ?? 'Suppression impossible.');
        this.saving.set(false);
        this.confirmOpen.set(false);
      },
    });
  }
}
