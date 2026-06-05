import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PublicShellComponent } from '../shared/public-shell.component';
import { PublicCatalogService } from '../services/public-catalog.service';
import {
  InstitutionOfferingItem,
  PrivateInstitutionCard,
} from '../../../core/models/catalog.model';
import { APP_ROUTES } from '../../../core/constants/routes.constant';
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
  private readonly catalog = inject(PublicCatalogService);

  readonly routes = APP_ROUTES;
  readonly item = signal<OfferingDetail | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

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
      opportunity: 'Offre / stage',
    };
    return labels[type ?? ''] ?? 'Publication';
  }

  opportunityLabel(type: string | null | undefined): string {
    if (type === 'job') return 'Emploi';
    if (type === 'internship') return 'Stage';
    return '';
  }

  dateLabel(item: InstitutionOfferingItem): string {
    const start = item.startDate ? new Date(item.startDate).toLocaleDateString('fr-FR') : '';
    const end = item.endDate ? new Date(item.endDate).toLocaleDateString('fr-FR') : '';
    if (start && end && start !== end) return `${start} - ${end}`;
    return start || end || '';
  }
}
