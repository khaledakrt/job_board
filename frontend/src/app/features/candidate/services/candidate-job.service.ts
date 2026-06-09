import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';
import { Job } from '../../../core/models/job.model';
import { QuizAnswerPayload } from '../../../core/models/job-quiz.model';
import { PaginatedJobs } from '../../../core/models/candidate-profile.model';

export interface JobSearchParams {
  keywords?: string;
  location?: string;
  contractType?: string;
  remoteType?: string;
  minSalary?: number;
  sortBy?: 'date' | 'salary' | 'experience';
  page?: number;
  limit?: number;
}

function buildSearchQueryParams(params: JobSearchParams): Record<string, string | number> {
  const query: Record<string, string | number> = {};

  const keywords = params.keywords?.trim();
  if (keywords) query['keywords'] = keywords;

  const location = params.location?.trim();
  if (location) query['location'] = location;

  if (params.contractType) query['contractType'] = params.contractType;
  if (params.remoteType) query['remoteType'] = params.remoteType;
  if (params.minSalary != null && params.minSalary > 0) query['minSalary'] = params.minSalary;
  if (params.sortBy) query['sortBy'] = params.sortBy;

  if (params.page != null && params.page > 0) query['page'] = params.page;
  if (params.limit != null && params.limit > 0) query['limit'] = params.limit;

  return query;
}

@Injectable({ providedIn: 'root' })
export class CandidateJobService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/jobs`;

  search(
    params: JobSearchParams
  ): Observable<
    ApiResponse<Job[]> & { pagination?: PaginatedJobs<Job>['pagination'] }
  > {
    return this.http.get<ApiResponse<Job[]> & { pagination?: PaginatedJobs<Job>['pagination'] }>(
      this.apiUrl,
      {
        params: buildSearchQueryParams(params),
      }
    );
  }

  getById(id: string): Observable<ApiResponse<Job>> {
    return this.http.get<ApiResponse<Job>>(`${this.apiUrl}/${id}`);
  }

  apply(
    jobId: string,
    payload: { coverLetter?: string; quizAnswers?: QuizAnswerPayload[] }
  ): Observable<ApiResponse<unknown>> {
    return this.http.post<ApiResponse<unknown>>(`${this.apiUrl}/${jobId}/apply`, payload);
  }

  generateLetter(jobId: string): Observable<ApiResponse<{ fullText: string; paragraphs: string[] }>> {
    return this.http.post<ApiResponse<{ fullText: string; paragraphs: string[] }>>(
      `${environment.apiUrl}/candidate/applications/generate-letter`,
      { jobId }
    );
  }
}
