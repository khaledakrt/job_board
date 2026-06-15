import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';
import { Company } from '../../../core/models/company.model';
import { RecruiterProfile } from '../../../core/models/recruiter.model';

@Injectable({ providedIn: 'root' })
export class RecruiterContextService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  private readonly profileState = signal<RecruiterProfile | null>(null);
  private readonly companyState = signal<Company | null>(null);
  private readonly checkedState = signal(false);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly profile = this.profileState.asReadonly();
  readonly company = this.companyState.asReadonly();
  readonly checked = this.checkedState.asReadonly();

  readonly isOwner = computed(
    () => this.profileState()?.companyRole === 'owner'
  );
  readonly canPostJob = computed(
    () => this.isOwner() || !!this.profileState()?.canPostJob
  );
  readonly canPublishJobs = computed(
    () => this.canPostJob() && this.profileState()?.publicationAccess?.canPublish !== false
  );
  readonly publicationAccess = computed(() => this.profileState()?.publicationAccess ?? null);
  readonly canDecideApplication = computed(
    () => this.isOwner() || !!this.profileState()?.canDecideApplication
  );
  readonly canEditCompany = computed(
    () => this.isOwner() || !!this.profileState()?.canEditCompany
  );
  readonly hasCompany = computed(() => !!this.companyState()?.id);

  loadContext() {
    this.loading.set(true);
    this.error.set(null);

    return this.http
      .get<ApiResponse<RecruiterProfile>>(`${this.apiUrl}/recruiter/profile`)
      .pipe(
        tap({
          next: (response) => {
            if (response.data) {
              this.profileState.set(response.data);
              if (response.data.company) {
                const c = response.data.company;
                this.companyState.set({
                  id: c.id,
                  name: c.name,
                  legalName: c.legalName ?? null,
                  legalForm: c.legalForm ?? null,
                  siret: c.siret ?? null,
                  vatNumber: c.vatNumber ?? null,
                  streetAddress: c.streetAddress ?? null,
                  postalCode: c.postalCode ?? null,
                  city: c.city ?? null,
                  country: c.country ?? null,
                  contactEmail: c.contactEmail ?? null,
                  contactPhone: c.contactPhone ?? null,
                  contactEmailPublic: Boolean(c.contactEmailPublic),
                  contactPhonePublic: Boolean(c.contactPhonePublic),
                  logoUrl: c.logoUrl ?? null,
                  website: c.website ?? null,
                  linkedinUrl: c.linkedinUrl ?? null,
                  description: c.description ?? null,
                  industry: c.industry ?? null,
                  scaleSize: c.scaleSize ?? null,
                  foundedYear: c.foundedYear ?? null,
                });
              } else {
                this.companyState.set(null);
              }
            } else {
              this.profileState.set(null);
              this.companyState.set(null);
            }
            this.checkedState.set(true);
            this.loading.set(false);
          },
          error: () => {
            this.error.set('Unable to load recruiter workspace context.');
            this.checkedState.set(true);
            this.loading.set(false);
          },
        }),
        catchError(() => {
          this.profileState.set(null);
          this.companyState.set(null);
          this.error.set('Unable to load recruiter workspace context.');
          this.checkedState.set(true);
          this.loading.set(false);
          return of({ success: false, message: 'Contexte recruteur indisponible.', data: null });
        })
      );
  }

  setCompany(company: Company): void {
    this.companyState.set(company);
  }

  updateCompanyLogo(logoUrl: string): void {
    const company = this.companyState();
    if (company) {
      this.companyState.set({ ...company, logoUrl });
    }
  }
}
