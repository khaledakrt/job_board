import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';
import { PaginationMeta } from '../../../core/models/pagination.model';
import {
  AdminCatalogDetail,
  AdminCatalogListItem,
  AdminApplicationDetail,
  AdminApplicationListItem,
  AdminCompanyDetail,
  AdminCompanySubscription,
  AdminCompanyListItem,
  AdminJobDetail,
  AdminJobListItem,
  AdminStats,
  AdminSubscriptionPaymentRequest,
  AdminSubscriptionPolicy,
  AdminUserDetail,
  AdminUserListItem,
  CatalogPublishStatus,
  CreateAdminUserRequest,
  LoginEvent,
  UpdateAdminUserRequest,
} from '../../../core/models/admin.model';
import { InstitutionOfferingItem, TrainingEventType } from '../../../core/models/catalog.model';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/admin`;

  getStats(): Observable<ApiResponse<AdminStats>> {
    return this.http.get<ApiResponse<AdminStats>>(`${this.base}/stats`);
  }

  getSubscriptionPolicy(): Observable<ApiResponse<AdminSubscriptionPolicy>> {
    return this.http.get<ApiResponse<AdminSubscriptionPolicy>>(
      `${this.base}/subscription-policy`
    );
  }

  updateSubscriptionPolicy(
    mode: AdminSubscriptionPolicy['mode']
  ): Observable<ApiResponse<AdminSubscriptionPolicy>> {
    return this.http.patch<ApiResponse<AdminSubscriptionPolicy>>(
      `${this.base}/subscription-policy`,
      { mode }
    );
  }

  listSubscriptionPaymentRequests(): Observable<ApiResponse<AdminSubscriptionPaymentRequest[]>> {
    return this.http.get<ApiResponse<AdminSubscriptionPaymentRequest[]>>(
      `${this.base}/subscription-payment-requests`
    );
  }

  reviewSubscriptionPaymentRequest(
    id: string,
    action: 'approve' | 'reject',
    adminNote?: string
  ): Observable<ApiResponse<unknown>> {
    return this.http.patch<ApiResponse<unknown>>(
      `${this.base}/subscription-payment-requests/${id}`,
      { action, adminNote }
    );
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

  getJob(id: string): Observable<ApiResponse<AdminJobDetail>> {
    return this.http.get<ApiResponse<AdminJobDetail>>(`${this.base}/jobs/${id}`);
  }

  updateJobStatus(id: string, status: string): Observable<ApiResponse<AdminJobListItem>> {
    return this.http.patch<ApiResponse<AdminJobListItem>>(`${this.base}/jobs/${id}/status`, {
      status,
    });
  }

  deleteJob(id: string): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.base}/jobs/${id}`);
  }

  listCompanies(params: Record<string, string | number>): Observable<
    ApiResponse<AdminCompanyListItem[]> & { pagination: PaginationMeta }
  > {
    return this.http.get<ApiResponse<AdminCompanyListItem[]> & { pagination: PaginationMeta }>(
      `${this.base}/companies`,
      { params: new HttpParams({ fromObject: params as Record<string, string> }) }
    );
  }

  getCompany(id: string): Observable<ApiResponse<AdminCompanyDetail>> {
    return this.http.get<ApiResponse<AdminCompanyDetail>>(`${this.base}/companies/${id}`);
  }

  activateCompanySubscription(
    id: string,
    months = 12
  ): Observable<ApiResponse<AdminCompanySubscription>> {
    return this.http.patch<ApiResponse<AdminCompanySubscription>>(
      `${this.base}/companies/${id}/subscription`,
      { action: 'activate_manual', planType: 'manual_free', months }
    );
  }

  cancelCompanySubscription(id: string): Observable<ApiResponse<AdminCompanySubscription>> {
    return this.http.patch<ApiResponse<AdminCompanySubscription>>(
      `${this.base}/companies/${id}/subscription`,
      { action: 'cancel' }
    );
  }

  listApplications(params: Record<string, string | number>): Observable<
    ApiResponse<AdminApplicationListItem[]> & { pagination: PaginationMeta }
  > {
    return this.http.get<ApiResponse<AdminApplicationListItem[]> & { pagination: PaginationMeta }>(
      `${this.base}/applications`,
      { params: new HttpParams({ fromObject: params as Record<string, string> }) }
    );
  }

  getApplication(id: string): Observable<ApiResponse<AdminApplicationDetail>> {
    return this.http.get<ApiResponse<AdminApplicationDetail>>(`${this.base}/applications/${id}`);
  }

  listTrainingCenters(params: Record<string, string | number>): Observable<
    ApiResponse<AdminCatalogListItem[]> & { pagination: PaginationMeta }
  > {
    return this.http.get<ApiResponse<AdminCatalogListItem[]> & { pagination: PaginationMeta }>(
      `${this.base}/training-centers`,
      { params: new HttpParams({ fromObject: params as Record<string, string> }) }
    );
  }

  getTrainingCenter(id: string): Observable<ApiResponse<AdminCatalogDetail>> {
    return this.http.get<ApiResponse<AdminCatalogDetail>>(`${this.base}/training-centers/${id}`);
  }

  createTrainingCenter(body: Record<string, unknown>): Observable<ApiResponse<AdminCatalogDetail>> {
    return this.http.post<ApiResponse<AdminCatalogDetail>>(`${this.base}/training-centers`, body);
  }

  updateTrainingCenter(
    id: string,
    body: Record<string, unknown>
  ): Observable<ApiResponse<AdminCatalogDetail>> {
    return this.http.patch<ApiResponse<AdminCatalogDetail>>(
      `${this.base}/training-centers/${id}`,
      body
    );
  }

  setTrainingCenterStatus(
    id: string,
    status: CatalogPublishStatus
  ): Observable<ApiResponse<{ id: string; status: string }>> {
    return this.http.patch<ApiResponse<{ id: string; status: string }>>(
      `${this.base}/training-centers/${id}/status`,
      { status }
    );
  }

  listPrivateInstitutions(params: Record<string, string | number>): Observable<
    ApiResponse<AdminCatalogListItem[]> & { pagination: PaginationMeta }
  > {
    return this.http.get<ApiResponse<AdminCatalogListItem[]> & { pagination: PaginationMeta }>(
      `${this.base}/private-institutions`,
      { params: new HttpParams({ fromObject: params as Record<string, string> }) }
    );
  }

  getPrivateInstitution(id: string): Observable<ApiResponse<AdminCatalogDetail>> {
    return this.http.get<ApiResponse<AdminCatalogDetail>>(
      `${this.base}/private-institutions/${id}`
    );
  }

  createPrivateInstitution(
    body: Record<string, unknown>
  ): Observable<ApiResponse<AdminCatalogDetail>> {
    return this.http.post<ApiResponse<AdminCatalogDetail>>(
      `${this.base}/private-institutions`,
      body
    );
  }

  updatePrivateInstitution(
    id: string,
    body: Record<string, unknown>
  ): Observable<ApiResponse<AdminCatalogDetail>> {
    return this.http.patch<ApiResponse<AdminCatalogDetail>>(
      `${this.base}/private-institutions/${id}`,
      body
    );
  }

  setPrivateInstitutionStatus(
    id: string,
    status: CatalogPublishStatus
  ): Observable<ApiResponse<{ id: string; status: string }>> {
    return this.http.patch<ApiResponse<{ id: string; status: string }>>(
      `${this.base}/private-institutions/${id}/status`,
      { status }
    );
  }

  listTrainingFormations(params: Record<string, string | number>): Observable<
    ApiResponse<AdminOfferingItem[]> & { pagination: PaginationMeta }
  > {
    return this.http.get<ApiResponse<AdminOfferingItem[]> & { pagination: PaginationMeta }>(
      `${this.base}/training-formations`,
      { params: new HttpParams({ fromObject: params as Record<string, string> }) }
    );
  }

  setTrainingFormationStatus(
    id: string,
    status: CatalogPublishStatus,
    adminNote?: string | null
  ): Observable<ApiResponse<AdminOfferingItem>> {
    return this.http.patch<ApiResponse<AdminOfferingItem>>(
      `${this.base}/training-formations/${id}/status`,
      { status, adminNote: adminNote ?? null }
    );
  }

  listTrainingEvents(params: Record<string, string | number>): Observable<
    ApiResponse<AdminOfferingItem[]> & { pagination: PaginationMeta }
  > {
    return this.http.get<ApiResponse<AdminOfferingItem[]> & { pagination: PaginationMeta }>(
      `${this.base}/training-events`,
      { params: new HttpParams({ fromObject: params as Record<string, string> }) }
    );
  }

  setTrainingEventStatus(
    id: string,
    status: CatalogPublishStatus,
    adminNote?: string | null
  ): Observable<ApiResponse<AdminOfferingItem>> {
    return this.http.patch<ApiResponse<AdminOfferingItem>>(
      `${this.base}/training-events/${id}/status`,
      { status, adminNote: adminNote ?? null }
    );
  }

  setInstitutionOfferingStatus(
    id: string,
    status: CatalogPublishStatus,
    adminNote?: string | null
  ): Observable<ApiResponse<InstitutionOfferingItem>> {
    return this.http.patch<ApiResponse<InstitutionOfferingItem>>(
      `${this.base}/private-institution-offerings/${id}/status`,
      { status, adminNote: adminNote ?? null }
    );
  }

  listInstitutionOfferings(params: Record<string, string | number>): Observable<
    ApiResponse<(InstitutionOfferingItem & { institution?: { id: string; name: string; status: string } | null })[]> & {
      pagination: PaginationMeta;
    }
  > {
    return this.http.get<
      ApiResponse<(InstitutionOfferingItem & { institution?: { id: string; name: string; status: string } | null })[]> & {
        pagination: PaginationMeta;
      }
    >(`${this.base}/private-institution-offerings`, {
      params: new HttpParams({ fromObject: params as Record<string, string> }),
    });
  }
}

export interface AdminOfferingItem {
  id: string;
  centerId?: string;
  centerName?: string | null;
  title: string;
  status: CatalogPublishStatus;
  city?: string | null;
  category?: string | null;
  eventType?: TrainingEventType;
  startDate?: string | null;
  endDate?: string | null;
  eventDate?: string | null;
  startTime?: string | null;
  price?: number | null;
  adminNote?: string | null;
  createdAt?: string;
}
