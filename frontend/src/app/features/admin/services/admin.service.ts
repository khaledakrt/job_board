import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';
import { PaginationMeta } from '../../../core/models/pagination.model';
import {
  AdminJobListItem,
  AdminStats,
  AdminUserDetail,
  AdminUserListItem,
  CreateAdminUserRequest,
  LoginEvent,
  UpdateAdminUserRequest,
} from '../../../core/models/admin.model';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/admin`;

  getStats(): Observable<ApiResponse<AdminStats>> {
    return this.http.get<ApiResponse<AdminStats>>(`${this.base}/stats`);
  }

  listUsers(params: Record<string, string | number>): Observable<
    ApiResponse<AdminUserListItem[]> & { pagination: PaginationMeta }
  > {
    return this.http.get<ApiResponse<AdminUserListItem[]> & { pagination: PaginationMeta }>(
      `${this.base}/users`,
      { params: new HttpParams({ fromObject: params as Record<string, string> }) }
    );
  }

  getUser(id: string): Observable<ApiResponse<AdminUserDetail>> {
    return this.http.get<ApiResponse<AdminUserDetail>>(`${this.base}/users/${id}`);
  }

  createUser(body: CreateAdminUserRequest): Observable<ApiResponse<AdminUserDetail>> {
    return this.http.post<ApiResponse<AdminUserDetail>>(`${this.base}/users`, body);
  }

  updateUser(id: string, body: UpdateAdminUserRequest): Observable<ApiResponse<AdminUserDetail>> {
    return this.http.patch<ApiResponse<AdminUserDetail>>(`${this.base}/users/${id}`, body);
  }

  setPassword(id: string, password: string): Observable<ApiResponse<null>> {
    return this.http.post<ApiResponse<null>>(`${this.base}/users/${id}/password`, { password });
  }

  banUser(id: string, reason?: string): Observable<ApiResponse<AdminUserDetail>> {
    return this.http.post<ApiResponse<AdminUserDetail>>(`${this.base}/users/${id}/ban`, { reason });
  }

  unbanUser(id: string): Observable<ApiResponse<AdminUserDetail>> {
    return this.http.post<ApiResponse<AdminUserDetail>>(`${this.base}/users/${id}/unban`, {});
  }

  deleteUser(id: string): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.base}/users/${id}`);
  }

  listLoginEvents(
    userId: string,
    page: number
  ): Observable<ApiResponse<LoginEvent[]> & { pagination: PaginationMeta }> {
    return this.http.get<ApiResponse<LoginEvent[]> & { pagination: PaginationMeta }>(
      `${this.base}/users/${userId}/login-events`,
      { params: { page: String(page), limit: '20' } }
    );
  }

  listJobs(params: Record<string, string | number>): Observable<
    ApiResponse<AdminJobListItem[]> & { pagination: PaginationMeta }
  > {
    return this.http.get<ApiResponse<AdminJobListItem[]> & { pagination: PaginationMeta }>(
      `${this.base}/jobs`,
      { params: new HttpParams({ fromObject: params as Record<string, string> }) }
    );
  }

  updateJobStatus(id: string, status: string): Observable<ApiResponse<AdminJobListItem>> {
    return this.http.patch<ApiResponse<AdminJobListItem>>(`${this.base}/jobs/${id}/status`, {
      status,
    });
  }

  deleteJob(id: string): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.base}/jobs/${id}`);
  }
}
