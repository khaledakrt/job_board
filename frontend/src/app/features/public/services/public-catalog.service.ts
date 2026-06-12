import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';
import { PaginationMeta } from '../../../core/models/pagination.model';
import {
  CatalogSubmitResult,
  PrivateInstitutionCard,
  PrivateInstitutionDetail,
  InstitutionOfferingItem,
  TrainingCenterCard,
  TrainingCenterDetail,
  TrainingFormationItem,
  TrainingEventItem,
  ParticipationType,
} from '../../../core/models/catalog.model';

@Injectable({ providedIn: 'root' })
export class PublicCatalogService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/public`;

  listTrainingCenters(params: Record<string, string | number>) {
    return this.http.get<ApiResponse<TrainingCenterCard[]> & { pagination: PaginationMeta }>(
      `${this.base}/training-centers`,
      { params: new HttpParams({ fromObject: params as Record<string, string> }) }
    );
  }

  getTrainingCenter(id: string) {
    return this.http.get<ApiResponse<TrainingCenterDetail>>(
      `${this.base}/training-centers/${id}`
    );
  }

  listCenterFormations(centerId: string, params: Record<string, string | number>) {
    return this.http.get<ApiResponse<TrainingFormationItem[]> & { pagination: PaginationMeta }>(
      `${this.base}/training-centers/${centerId}/formations`,
      { params: new HttpParams({ fromObject: params as Record<string, string> }) }
    );
  }

  listCenterEvents(centerId: string, params: Record<string, string | number>) {
    return this.http.get<ApiResponse<TrainingEventItem[]> & { pagination: PaginationMeta }>(
      `${this.base}/training-centers/${centerId}/events`,
      { params: new HttpParams({ fromObject: params as Record<string, string> }) }
    );
  }

  listPrivateInstitutions(params: Record<string, string | number>) {
    return this.http.get<ApiResponse<PrivateInstitutionCard[]> & { pagination: PaginationMeta }>(
      `${this.base}/private-institutions`,
      { params: new HttpParams({ fromObject: params as Record<string, string> }) }
    );
  }

  getPrivateInstitution(id: string) {
    return this.http.get<ApiResponse<PrivateInstitutionDetail>>(
      `${this.base}/private-institutions/${id}`
    );
  }

  listPrivateInstitutionOfferings(institutionId: string, params: Record<string, string | number>) {
    return this.http.get<ApiResponse<InstitutionOfferingItem[]> & { pagination: PaginationMeta }>(
      `${this.base}/private-institutions/${institutionId}/offerings`,
      { params: new HttpParams({ fromObject: params as Record<string, string> }) }
    );
  }

  getInstitutionOffering(id: string) {
    return this.http.get<ApiResponse<InstitutionOfferingItem & { institution?: PrivateInstitutionCard }>>(
      `${this.base}/private-institutions/publications/${id}`
    );
  }

  submitPrivateInstitution(body: unknown) {
    return this.http.post<ApiResponse<CatalogSubmitResult>>(
      `${this.base}/private-institutions`,
      body
    );
  }

  getFormation(id: string) {
    return this.http.get<ApiResponse<TrainingFormationItem>>(`${this.base}/formations/${id}`);
  }

  getEvent(id: string) {
    return this.http.get<ApiResponse<TrainingEventItem>>(`${this.base}/events/${id}`);
  }

  participateFormation(id: string) {
    return this.http.post<ApiResponse<{ participationType: ParticipationType }>>(
      `${this.base}/formations/${id}/participate`,
      { participationType: 'registered' }
    );
  }

  participateEvent(id: string) {
    return this.http.post<ApiResponse<{ participationType: ParticipationType }>>(
      `${this.base}/events/${id}/participate`,
      { participationType: 'registered' }
    );
  }

  participateInstitutionOffering(id: string, participationType: ParticipationType = 'registered') {
    return this.http.post<ApiResponse<{ participationType: ParticipationType }>>(
      `${this.base}/private-institutions/publications/${id}/participate`,
      { participationType }
    );
  }
}
