import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { PaginationMeta } from '../../../core/models/pagination.model';
import { ProtectedFileService } from '../../../core/services/protected-file.service';
import { resolveAuthenticatedUploadUrl, resolveUploadUrl } from '../../../core/utils/asset-url.util';
import { AdminPaginationComponent } from '../../admin/shared/admin-pagination.component';
import {
  RecruiterCandidate,
  RecruiterCandidateFacets,
  RecruiterCandidatesService,
} from '../services/recruiter-candidates.service';

const PAGE_SIZE = 10;
const EMPTY_FACETS: RecruiterCandidateFacets = {
  countries: [],
  skills: [],
  languages: [],
  titles: [],
  contracts: [],
};

@Component({
  selector: 'app-recruiter-candidates',
  standalone: true,
  imports: [DatePipe, AdminPaginationComponent],
  templateUrl: './recruiter-candidates.component.html',
  styleUrl: './recruiter-candidates.component.css',
})
export class RecruiterCandidatesComponent implements OnInit, OnDestroy {
  private readonly candidatesService = inject(RecruiterCandidatesService);
  private readonly files = inject(ProtectedFileService);
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  readonly candidates = signal<RecruiterCandidate[]>([]);
  readonly pagination = signal<PaginationMeta | null>(null);
  readonly facets = signal<RecruiterCandidateFacets>(EMPTY_FACETS);
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly search = signal('');
  readonly country = signal('');
  readonly skill = signal('');
  readonly language = signal('');
  readonly title = signal('');
  readonly contract = signal('');
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

  skillPreview(person: RecruiterCandidate): string[] {
    return person.skills.slice(0, 3);
  }

  onSearch(value: string): void {
    this.search.set(value);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.page.set(1);
      this.load();
    }, 300);
  }

  onFilter(field: 'country' | 'skill' | 'language' | 'title' | 'contract', value: string): void {
    if (field === 'country') this.country.set(value);
    if (field === 'skill') this.skill.set(value);
    if (field === 'language') this.language.set(value);
    if (field === 'title') this.title.set(value);
    if (field === 'contract') this.contract.set(value);
    this.page.set(1);
    this.load();
  }

  select(person: RecruiterCandidate): void {
    this.selectedId.set(this.selectedId() === person.id ? null : person.id);
  }

  goTo(page: number): void {
    this.page.set(page);
    this.load();
  }

  openCv(person: RecruiterCandidate, event?: Event): void {
    event?.stopPropagation();
    const url = resolveAuthenticatedUploadUrl(person.resumeUrl);
    if (!url) {
      this.errorMessage.set('Ce candidat n’a pas encore de CV.');
      return;
    }
    this.files.openFile(url, () => this.errorMessage.set('Impossible d’afficher le CV.'));
  }

  period(item: RecruiterCandidate['experiences'][number]): string {
    const end = item.current ? 'Aujourd’hui' : item.endDate;
    return [item.startDate, end].filter(Boolean).join(' – ');
  }

  private load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.candidatesService
      .list({
        search: this.search().trim(),
        country: this.country(),
        skill: this.skill(),
        language: this.language(),
        title: this.title(),
        contract: this.contract(),
        page: this.page(),
        limit: PAGE_SIZE,
      })
      .subscribe({
        next: (res) => {
          this.candidates.set(res.data ?? []);
          this.pagination.set(res.pagination ?? null);
          if (res.facets) this.facets.set(res.facets);
          const current = this.selectedId();
          const stillThere = (res.data ?? []).some((person) => person.id === current);
          if (!stillThere) this.selectedId.set(null);
          this.loading.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.errorMessage.set(err.error?.message || 'Impossible de charger les candidats.');
          this.loading.set(false);
        },
      });
  }
}
