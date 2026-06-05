import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ProviderService } from '../services/provider.service';
import {
  ProviderParticipationItem,
  ProviderParticipationsResponse,
} from '../../../core/models/catalog.model';
import { paginateSlice } from '../shared/provider-pagination.util';
import { ProviderListPaginationComponent } from '../shared/provider-list-pagination.component';

type KindFilter = '' | 'formation' | 'event';

interface OfferingOption {
  key: string;
  kind: 'formation' | 'event';
  id: string;
  title: string;
}

@Component({
  selector: 'app-provider-participants',
  standalone: true,
  imports: [FormsModule, DatePipe, ProviderListPaginationComponent],
  templateUrl: './provider-participants.component.html',
  styleUrls: ['../shared/provider-theme.css', './provider-participants.component.css'],
})
export class ProviderParticipantsComponent implements OnInit {
  private readonly providerService = inject(ProviderService);
  private readonly route = inject(ActivatedRoute);

  readonly pageSize = 20;

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly data = signal<ProviderParticipationsResponse | null>(null);
  readonly kindFilter = signal<KindFilter>('');
  readonly offeringFilter = signal('');
  readonly page = signal(1);

  readonly registeredItems = computed(() =>
    (this.data()?.items ?? []).filter((r) => r.participationType === 'registered')
  );

  readonly offeringOptions = computed((): OfferingOption[] => {
    const kind = this.kindFilter();
    const map = new Map<string, OfferingOption>();
    for (const row of this.registeredItems()) {
      if (kind && row.offeringKind !== kind) continue;
      const key = `${row.offeringKind}:${row.offeringId}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          kind: row.offeringKind,
          id: row.offeringId,
          title: row.offeringTitle,
        });
      }
    }
    return [...map.values()].sort((a, b) => a.title.localeCompare(b.title, 'fr'));
  });

  readonly filteredItems = computed(() => {
    const kind = this.kindFilter();
    const offering = this.offeringFilter();
    return this.registeredItems().filter((row) => {
      if (kind && row.offeringKind !== kind) return false;
      if (offering && `${row.offeringKind}:${row.offeringId}` !== offering) return false;
      return true;
    });
  });

  /** Titre imprimé : nom de la formation ou de l’événement filtré. */
  readonly printTitle = computed(() => {
    const key = this.offeringFilter();
    if (key) {
      return this.offeringOptions().find((o) => o.key === key)?.title ?? '';
    }
    const kind = this.kindFilter();
    if (kind === 'formation') return 'Formations — toutes';
    if (kind === 'event') return 'Événements — tous';
    return 'Inscrits — toutes publications';
  });

  readonly canPrint = computed(() => this.filteredItems().length > 0);

  readonly pageItems = computed(() =>
    paginateSlice(this.filteredItems(), this.page(), this.pageSize)
  );

  ngOnInit(): void {
    const formationId = this.route.snapshot.queryParamMap.get('formationId');
    const eventId = this.route.snapshot.queryParamMap.get('eventId');
    this.load(() => {
      if (formationId) {
        this.kindFilter.set('formation');
        this.offeringFilter.set(`formation:${formationId}`);
      } else if (eventId) {
        this.kindFilter.set('event');
        this.offeringFilter.set(`event:${eventId}`);
      }
    });
  }

  load(afterLoad?: () => void): void {
    this.loading.set(true);
    this.error.set(null);
    this.providerService.listParticipations({ participationType: 'registered' }).subscribe({
      next: (res) => {
        this.data.set(
          res.data ?? {
            items: [],
            summary: { total: 0, interested: 0, registered: 0, formations: 0, events: 0 },
          }
        );
        this.loading.set(false);
        this.page.set(1);
        afterLoad?.();
      },
      error: () => {
        this.error.set('Impossible de charger la liste des participants.');
        this.loading.set(false);
      },
    });
  }

  onKindFilterChange(value: KindFilter): void {
    this.kindFilter.set(value);
    const current = this.offeringFilter();
    if (current && value && !current.startsWith(`${value}:`)) {
      this.offeringFilter.set('');
    }
    this.page.set(1);
  }

  onOfferingFilterChange(value: string): void {
    this.offeringFilter.set(value);
    if (value) {
      const kind = value.split(':')[0] as KindFilter;
      if (kind === 'formation' || kind === 'event') {
        this.kindFilter.set(kind);
      }
    }
    this.page.set(1);
  }

  onFilterChange(): void {
    this.page.set(1);
  }

  offeringKindLabel(row: ProviderParticipationItem): string {
    return row.offeringKind === 'formation' ? 'Formation' : 'Événement';
  }

  participationClass(row: ProviderParticipationItem): string {
    return 'provider-pill provider-pill--ok';
  }

  candidateLastName(row: ProviderParticipationItem): string {
    return row.candidate.lastName?.trim() || '—';
  }

  candidateFirstName(row: ProviderParticipationItem): string {
    return row.candidate.firstName?.trim() || '—';
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  printList(): void {
    if (!this.canPrint()) return;

    const rows = this.filteredItems()
      .map(
        (row) => `
          <tr>
            <td>${this.escapeHtml(this.candidateLastName(row))}</td>
            <td>${this.escapeHtml(this.candidateFirstName(row))}</td>
            <td>${this.escapeHtml(row.candidate.email)}</td>
            <td>${this.escapeHtml(row.candidate.phone || '—')}</td>
          </tr>`
      )
      .join('');

    const width = 900;
    const height = 700;
    const left = Math.max(0, Math.round((window.screen.width - width) / 2));
    const top = Math.max(0, Math.round((window.screen.height - height) / 2));
    const printWindow = window.open(
      '',
      '_blank',
      `width=${width},height=${height},left=${left},top=${top}`
    );
    if (!printWindow) return;

    printWindow.document.open();
    printWindow.document.write(`<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>${this.escapeHtml(this.printTitle())}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm 14mm; }
    body { font-family: Arial, sans-serif; color: #0f172a; margin: 0; }
    h1 { margin: 0 0 16px; font-size: 18px; line-height: 1.35; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #94a3b8; padding: 7px 8px; text-align: left; }
    th { background: #f8fafc; font-weight: 700; text-transform: uppercase; font-size: 11px; }
  </style>
</head>
<body>
  <h1>${this.escapeHtml(this.printTitle())}</h1>
  <table>
    <thead>
      <tr>
        <th>Nom</th>
        <th>Prénom</th>
        <th>E-mail</th>
        <th>Téléphone</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <script>
    window.onload = () => {
      window.focus();
      window.print();
      window.onafterprint = () => window.close();
    };
  </script>
</body>
</html>`);
    printWindow.document.close();
  }
}
