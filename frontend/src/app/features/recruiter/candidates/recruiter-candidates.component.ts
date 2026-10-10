import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { PaginationMeta } from '../../../core/models/pagination.model';
import { ProtectedFileService } from '../../../core/services/protected-file.service';
import { resolveAuthenticatedUploadUrl, resolveUploadUrl } from '../../../core/utils/asset-url.util';
import {
  RecruiterCandidate,
  RecruiterCandidatesService,
} from '../services/recruiter-candidates.service';

const PAGE_SIZE = 10;

@Component({
  selector: 'app-recruiter-candidates',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './recruiter-candidates.component.html',
  styleUrl: './recruiter-candidates.component.css',
})
export class RecruiterCandidatesComponent implements OnInit, OnDestroy {
  private readonly candidatesService = inject(RecruiterCandidatesService);
  private readonly files = inject(ProtectedFileService);
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  readonly candidates = signal<RecruiterCandidate[]>([]);
  readonly pagination = signal<PaginationMeta | null>(null);
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly search = signal('');
  readonly page = signal(1);
  readonly selectedId = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
  }

  selected(): RecruiterCandidate | null {
    const id = this.selectedId();
    return this.candidates().find((person) => person.id === id) ?? null;
  }

  displayName(person: RecruiterCandidate): string {
    const name = [person.firstName, person.lastName].filter(Boolean).join(' ').trim();
    return name || person.email || 'Candidat';
  }

  initials(person: RecruiterCandidate): string {
    const parts = [person.firstName, person.lastName].filter(Boolean) as string[];
    if (parts.length) return parts.map((part) => part.charAt(0)).join('').slice(0, 2).toUpperCase();
    return (person.email || 'C').charAt(0).toUpperCase();
  }

  avatar(person: RecruiterCandidate): string | null {
    return resolveUploadUrl(person.avatarUrl);
  }

  onSearch(value: string): void {
    this.search.set(value);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.page.set(1);
      this.load();
    }, 300);
  }

  select(person: RecruiterCandidate): void {
    this.selectedId.set(person.id);
  }

  goTo(page: number): void {
    const meta = this.pagination();
    if (!meta || page < 1 || page > meta.totalPages || page === meta.page) return;
    this.page.set(page);
    this.load();
  }

  openCv(person: RecruiterCandidate): void {
    const url = resolveAuthenticatedUploadUrl(person.resumeUrl);
    if (!url) {
      this.errorMessage.set('Ce candidat n’a pas encore déposé de CV.');
      return;
    }
    this.files.openFile(url, () => this.errorMessage.set('Impossible d’ouvrir le CV.'));
  }

  period(item: RecruiterCandidate['experiences'][number]): string {
    const end = item.current ? 'Aujourd’hui' : item.endDate;
    return [item.startDate, end].filter(Boolean).join(' – ');
  }

  private load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.candidatesService
      .list({ search: this.search().trim(), page: this.page(), limit: PAGE_SIZE })
      .subscribe({
        next: (res) => {
          this.candidates.set(res.data ?? []);
          this.pagination.set(res.pagination ?? null);
          const current = this.selectedId();
          const stillThere = (res.data ?? []).some((person) => person.id === current);
          this.selectedId.set(stillThere ? current : (res.data?.[0]?.id ?? null));
          this.loading.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.errorMessage.set(err.error?.message || 'Impossible de charger les candidats.');
          this.loading.set(false);
        },
      });
  }
}
