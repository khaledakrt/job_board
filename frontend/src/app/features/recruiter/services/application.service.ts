import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';
import { PaginationMeta } from '../../../core/models/pagination.model';
import {
  Application,
  ApplicationDetail,
  UpdateApplicationStatusPayload,
} from '../../../core/models/application.model';
import { ApplicationStatus } from '../../../core/constants/application-status.constant';

export interface ApplicationListParams {
  jobId?: string;
  status?: ApplicationStatus;
  archived?: boolean;
  page?: number;
  limit?: number;
}

export type ApplicationListResponse = ApiResponse<Application[]> & {
  pagination: PaginationMeta;
};

export type UpdateApplicationStatusResponse = ApiResponse<Application> & {
  meta?: {
    emailSent?: boolean;
  };
};

@Injectable({ providedIn: 'root' })
export class RecruiterApplicationService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/applications`;

  list(params?: ApplicationListParams): Observable<ApplicationListResponse> {
    const query: Record<string, string | number> = {};
    if (params?.jobId) query['jobId'] = params.jobId;
    if (params?.status) query['status'] = params.status;
    if (params?.archived !== undefined) query['archived'] = String(params.archived);
    if (params?.page) query['page'] = params.page;
    if (params?.limit) query['limit'] = params.limit;
    return this.http.get<ApplicationListResponse>(this.apiUrl, { params: query });
  }

  getById(id: string): Observable<ApiResponse<ApplicationDetail>> {
    return this.http.get<ApiResponse<ApplicationDetail>>(`${this.apiUrl}/${id}`);
  }

  updateStatus(
    id: string,
    payload: UpdateApplicationStatusPayload
  ): Observable<UpdateApplicationStatusResponse> {
    return this.http.patch<UpdateApplicationStatusResponse>(`${this.apiUrl}/${id}/status`, payload);
  }

  addNote(id: string, noteText: string): Observable<ApiResponse<{ id: string }>> {
    return this.http.post<ApiResponse<{ id: string }>>(`${this.apiUrl}/${id}/notes`, { noteText });
  }

  restore(id: string): Observable<ApiResponse<Application>> {
    return this.http.patch<ApiResponse<Application>>(`${this.apiUrl}/${id}/restore`, {});
  }

  deleteFromArchive(id: string): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.apiUrl}/${id}/archive`);
  }
}

