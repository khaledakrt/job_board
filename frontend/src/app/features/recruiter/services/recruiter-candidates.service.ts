import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';
import { PaginationMeta } from '../../../core/models/pagination.model';

export interface RecruiterCandidateExperience {
  title: string;
  company: string;
  city: string;
  startDate: string;
  endDate: string;
  current: boolean;
}

export interface RecruiterCandidateEducation {
  institution: string;
  degree: string;
  city: string;
}

export interface RecruiterCandidate {
  id: string;
  userId: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  professionalTitle: string | null;
  bio: string | null;
  skills: string[];
  languages: string[];
  experiences: RecruiterCandidateExperience[];
  education: RecruiterCandidateEducation[];
  locations: string[];
  location: string | null;
  contractTypes: string[];
  linkedinUrl: string | null;
  portfolioUrl: string | null;
  resumeUrl: string | null;
  avatarUrl: string | null;
  createdAt: string | null;
}

export interface RecruiterCandidateFacets {
  countries: string[];
  skills: string[];
  languages: string[];
  titles: string[];
  contracts: string[];
}

export type RecruiterCandidateListResponse = ApiResponse<RecruiterCandidate[]> & {
  pagination: PaginationMeta;
  facets?: RecruiterCandidateFacets;
};

@Injectable({ providedIn: 'root' })
export class RecruiterCandidatesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/recruiter/candidates`;

  list(params: {
    search?: string;
    country?: string;
    skill?: string;
    language?: string;
    title?: string;
    contract?: string;
    page?: number;
    limit?: number;
  }): Observable<RecruiterCandidateListResponse> {
    let query = new HttpParams();
    if (params.search) query = query.set('search', params.search);
    if (params.country) query = query.set('country', params.country);
    if (params.skill) query = query.set('skill', params.skill);
    if (params.language) query = query.set('language', params.language);
    if (params.title) query = query.set('title', params.title);
    if (params.contract) query = query.set('contract', params.contract);
    if (params.page) query = query.set('page', String(params.page));
    if (params.limit) query = query.set('limit', String(params.limit));
    return this.http.get<RecruiterCandidateListResponse>(this.apiUrl, { params: query });
  }
}
