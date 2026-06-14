import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';
import { Application, ApplicationDetail } from '../../../core/models/application.model';

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedApplicationsResponse extends ApiResponse<Application[]> {
  pagination?: PaginationMeta;
}

@Injectable({ providedIn: 'root' })
export class CandidateApplicationsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/candidate/applications`;

  list(params?: {
    scope?: 'active' | 'archived' | 'all';
    status?: string;
    q?: string;
    page?: number;
    limit?: number;
  }): Observable<PaginatedApplicationsResponse> {
    const query: Record<string, string> = {};
    if (params?.scope) query['scope'] = params.scope;
    if (params?.status) query['status'] = params.status;
    if (params?.q?.trim()) query['q'] = params.q.trim();
    if (params?.page) query['page'] = String(params.page);
    if (params?.limit) query['limit'] = String(params.limit);
    return this.http.get<PaginatedApplicationsResponse>(this.base, { params: query });
  }

  getById(id: string): Observable<ApiResponse<ApplicationDetail>> {
    return this.http.get<ApiResponse<ApplicationDetail>>(`${this.base}/${id}`);
  }

  archiveRejected(id: string): Observable<ApiResponse<Application>> {
    return this.http.patch<ApiResponse<Application>>(`${this.base}/${id}/archive`, {});
  }

  listAppliedJobIds(): Observable<ApiResponse<string[]>> {
    return this.http.get<ApiResponse<string[]>>(`${this.base}/applied-job-ids`);
  }
}
