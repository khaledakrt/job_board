import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';
import { Job } from '../../../core/models/job.model';

export interface DashboardSummary {
  totals: {
    applications: number;
    active: number;
    archived: number;
    interview: number;
    offer: number;
  };
  responseRate: number;
  monthlyApplications: { month: string; count: number }[];
}

export interface RecruiterPreview {
  profile: Record<string, unknown>;
  completionPercent: number;
  tips: { id: string; text: string }[];
}

@Injectable({ providedIn: 'root' })
export class CandidateDashboardService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/candidate/dashboard`;

  getSummary(): Observable<ApiResponse<DashboardSummary>> {
    return this.http.get<ApiResponse<DashboardSummary>>(`${this.base}/summary`);
  }

  getRecommendedJobs(): Observable<ApiResponse<(Job & { matchScore?: number })[]>> {
    return this.http.get<ApiResponse<(Job & { matchScore?: number })[]>>(`${this.base}/recommended-jobs`);
  }

  getRecruiterPreview(): Observable<ApiResponse<RecruiterPreview>> {
    return this.http.get<ApiResponse<RecruiterPreview>>(`${this.base}/recruiter-preview`);
  }
}
