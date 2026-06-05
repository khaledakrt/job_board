import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';
import {
  ProviderDashboard,
  TrainingCourseItem,
  ProgramItem,
  TrainingFormationItem,
  TrainingEventItem,
  ProviderParticipationsResponse,
  InstitutionOfferingItem,
  InstitutionOfferingType,
} from '../../../core/models/catalog.model';
import { ProviderRegisterType } from '../../../core/constants/roles.constant';

@Injectable({ providedIn: 'root' })
export class ProviderService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/provider`;

  register(payload: {
    providerType: ProviderRegisterType;
    email: string;
    password: string;
    organizationName: string;
    city?: string;
    phone?: string;
  }) {
    return this.http.post<ApiResponse<{ message: string }>>(`${this.base}/register`, payload);
  }

  trainingDashboard() {
    return this.http.get<ApiResponse<ProviderDashboard>>(`${this.base}/training/dashboard`);
  }

  institutionDashboard() {
    return this.http.get<ApiResponse<ProviderDashboard>>(`${this.base}/institution/dashboard`);
  }

  updateTrainingProfile(body: Record<string, unknown>) {
    return this.http.patch<ApiResponse<ProviderDashboard>>(`${this.base}/training/profile`, body);
  }

  updateInstitutionProfile(body: Record<string, unknown>) {
    return this.http.patch<ApiResponse<ProviderDashboard>>(`${this.base}/institution/profile`, body);
  }

  uploadTrainingLogo(file: File) {
    const form = new FormData();
    form.append('logo', file);
    return this.http.post<ApiResponse<{ logoUrl: string }>>(`${this.base}/training/logo`, form);
  }

  uploadInstitutionLogo(file: File) {
    const form = new FormData();
    form.append('logo', file);
    return this.http.post<ApiResponse<{ logoUrl: string }>>(`${this.base}/institution/logo`, form);
  }

  uploadTrainingBrochure(file: File) {
    const form = new FormData();
    form.append('brochure', file);
    return this.http.post<ApiResponse<{ brochures: string[] }>>(`${this.base}/training/brochure`, form);
  }

  uploadInstitutionBrochure(file: File) {
    const form = new FormData();
    form.append('brochure', file);
    return this.http.post<ApiResponse<{ brochures: string[] }>>(
      `${this.base}/institution/brochure`,
      form
    );
  }

  listTrainingCourses() {
    return this.http.get<ApiResponse<TrainingCourseItem[]>>(`${this.base}/training/courses`);
  }

  createTrainingCourse(body: Partial<TrainingCourseItem>) {
    return this.http.post<ApiResponse<TrainingCourseItem>>(`${this.base}/training/courses`, body);
  }

  deleteTrainingCourse(id: string) {
    return this.http.delete<ApiResponse<unknown>>(`${this.base}/training/courses/${id}`);
  }

  uploadCatalogImage(file: File) {
    const form = new FormData();
    form.append('image', file);
    return this.http.post<ApiResponse<{ urls: string[] }>>(
      `${this.base}/training/catalog-images`,
      form
    );
  }

  uploadCatalogGallery(files: File[]) {
    const form = new FormData();
    files.forEach((f) => form.append('images', f));
    return this.http.post<ApiResponse<{ urls: string[] }>>(
      `${this.base}/training/catalog-gallery`,
      form
    );
  }

  listParticipations(params?: {
    offeringKind?: 'formation' | 'event';
    offeringId?: string;
    participationType?: 'interested' | 'registered';
  }) {
    let httpParams = new HttpParams();
    if (params?.offeringKind) {
      httpParams = httpParams.set('offeringKind', params.offeringKind);
    }
    if (params?.offeringId) {
      httpParams = httpParams.set('offeringId', params.offeringId);
    }
    if (params?.participationType) {
      httpParams = httpParams.set('participationType', params.participationType);
    }
    return this.http.get<ApiResponse<ProviderParticipationsResponse>>(
      `${this.base}/training/participations`,
      { params: httpParams }
    );
  }

  listFormations() {
    return this.http.get<ApiResponse<TrainingFormationItem[]>>(
      `${this.base}/training/formations`
    );
  }

  getFormation(id: string) {
    return this.http.get<ApiResponse<TrainingFormationItem>>(
      `${this.base}/training/formations/${id}`
    );
  }

  createFormation(body: Partial<TrainingFormationItem>) {
    return this.http.post<ApiResponse<TrainingFormationItem>>(
      `${this.base}/training/formations`,
      body
    );
  }

  updateFormation(id: string, body: Partial<TrainingFormationItem>) {
    return this.http.patch<ApiResponse<TrainingFormationItem>>(
      `${this.base}/training/formations/${id}`,
      body
    );
  }

  deleteFormation(id: string) {
    return this.http.delete<ApiResponse<unknown>>(`${this.base}/training/formations/${id}`);
  }

  listEvents() {
    return this.http.get<ApiResponse<TrainingEventItem[]>>(`${this.base}/training/events`);
  }

  getEvent(id: string) {
    return this.http.get<ApiResponse<TrainingEventItem>>(`${this.base}/training/events/${id}`);
  }

  createEvent(body: Partial<TrainingEventItem>) {
    return this.http.post<ApiResponse<TrainingEventItem>>(`${this.base}/training/events`, body);
  }

  updateEvent(id: string, body: Partial<TrainingEventItem>) {
    return this.http.patch<ApiResponse<TrainingEventItem>>(
      `${this.base}/training/events/${id}`,
      body
    );
  }

  deleteEvent(id: string) {
    return this.http.delete<ApiResponse<unknown>>(`${this.base}/training/events/${id}`);
  }

  listInstitutionPrograms() {
    return this.http.get<ApiResponse<ProgramItem[]>>(`${this.base}/institution/programs`);
  }

  addInstitutionProgram(body: ProgramItem) {
    return this.http.post<ApiResponse<ProgramItem[]>>(`${this.base}/institution/programs`, body);
  }

  listInstitutionOfferings(params?: {
    type?: InstitutionOfferingType;
    status?: string;
    search?: string;
  }) {
    let httpParams = new HttpParams();
    if (params?.type) httpParams = httpParams.set('type', params.type);
    if (params?.status) httpParams = httpParams.set('status', params.status);
    if (params?.search) httpParams = httpParams.set('search', params.search);
    return this.http.get<ApiResponse<InstitutionOfferingItem[]>>(
      `${this.base}/institution/offerings`,
      { params: httpParams }
    );
  }

  getInstitutionOffering(id: string) {
    return this.http.get<ApiResponse<InstitutionOfferingItem>>(
      `${this.base}/institution/offerings/${id}`
    );
  }

  createInstitutionOffering(type: InstitutionOfferingType, body: Partial<InstitutionOfferingItem>) {
    return this.http.post<ApiResponse<InstitutionOfferingItem>>(
      `${this.base}/institution/offerings/${type}`,
      body
    );
  }

  updateInstitutionOffering(id: string, body: Partial<InstitutionOfferingItem>) {
    return this.http.patch<ApiResponse<InstitutionOfferingItem>>(
      `${this.base}/institution/offerings/${id}`,
      body
    );
  }

  deleteInstitutionOffering(id: string) {
    return this.http.delete<ApiResponse<unknown>>(`${this.base}/institution/offerings/${id}`);
  }
}
