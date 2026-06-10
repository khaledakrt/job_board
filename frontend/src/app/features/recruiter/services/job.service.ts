import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';
import { PaginationMeta } from '../../../core/models/pagination.model';
import { Job, JobPayload } from '../../../core/models/job.model';
import { GenerateQuizPayload, JobQuiz } from '../../../core/models/job-quiz.model';
import { JobStatus } from '../../../core/constants/job.constant';

export interface RecruiterAnalyticsSummary {
  totalJobs: number;
  totalViews: number;
  totalApplicants: number;
  activeJobs: number;
}

export interface RecruiterJobListParams {
  status?: JobStatus;
  page?: number;
  limit?: number;
}

export type RecruiterJobListResponse = ApiResponse<Job[]> & { pagination: PaginationMeta };

@Injectable({ providedIn: 'root' })
export class RecruiterJobService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/recruiter/jobs`;
  private readonly recruiterUrl = `${environment.apiUrl}/recruiter`;

  list(params?: RecruiterJobListParams): Observable<RecruiterJobListResponse> {
    const query: Record<string, string | number> = {};
    if (params?.status) query['status'] = params.status;
    if (params?.page) query['page'] = params.page;
    if (params?.limit) query['limit'] = params.limit;
    return this.http.get<RecruiterJobListResponse>(this.apiUrl, { params: query });
  }

  summary(): Observable<ApiResponse<RecruiterAnalyticsSummary>> {
    return this.http.get<ApiResponse<RecruiterAnalyticsSummary>>(`${this.recruiterUrl}/summary`);
  }

  getById(id: string): Observable<ApiResponse<Job>> {
    return this.http.get<ApiResponse<Job>>(`${this.apiUrl}/${id}`);
  }

  create(payload: JobPayload): Observable<ApiResponse<Job>> {
    return this.http.post<ApiResponse<Job>>(this.apiUrl, payload);
  }

  update(id: string, payload: Partial<JobPayload>): Observable<ApiResponse<Job>> {
    return this.http.put<ApiResponse<Job>>(`${this.apiUrl}/${id}`, payload);
  }

  updateStatus(id: string, status: JobStatus): Observable<ApiResponse<Job>> {
    return this.http.patch<ApiResponse<Job>>(`${this.apiUrl}/${id}/status`, { status });
  }

  delete(id: string): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.apiUrl}/${id}`);
  }

  generateQuiz(payload: GenerateQuizPayload): Observable<ApiResponse<JobQuiz>> {
    return this.http.post<ApiResponse<JobQuiz>>(`${this.apiUrl}/generate-quiz`, payload);
  }
}
