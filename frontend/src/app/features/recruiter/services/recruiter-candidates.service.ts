import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';
import { PaginationMeta } from '../../../core/models/pagination.model';

export interface RecruiterCandidateExperience {
  title: string;
  company: string;
  startDate: string;
  endDate: string;
  current: boolean;
}

export interface RecruiterCandidateEducation {
  institution: string;
  degree: string;
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
  linkedinUrl: string | null;
  portfolioUrl: string | null;
  resumeUrl: string | null;
  avatarUrl: string | null;
  createdAt: string | null;
}

export type RecruiterCandidateListResponse = ApiResponse<RecruiterCandidate[]> & {
  pagination: PaginationMeta;
};

@Injectable({ providedIn: 'root' })
export class RecruiterCandidatesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/recruiter/candidates`;

  list(params: { search?: string; page?: number; limit?: number }): Observable<RecruiterCandidateListResponse> {
    let query = new HttpParams();
    if (params.search) query = query.set('search', params.search);
    if (params.page) query = query.set('page', String(params.page));
    if (params.limit) query = query.set('limit', String(params.limit));
    return this.http.get<RecruiterCandidateListResponse>(this.apiUrl, { params: query });
  }
}
