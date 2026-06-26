import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';
import {
  Company,
  CreateCompanyPayload,
  UpdateCompanyPayload,
} from '../../../core/models/company.model';

@Injectable({ providedIn: 'root' })
export class CompanyService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/companies`;

  create(payload: CreateCompanyPayload): Observable<ApiResponse<Company>> {
    return this.http.post<ApiResponse<Company>>(this.apiUrl, payload);
  }

  update(id: string, payload: UpdateCompanyPayload): Observable<ApiResponse<Company>> {
    return this.http.put<ApiResponse<Company>>(`${this.apiUrl}/${id}`, payload);
  }

  uploadLogo(id: string, file: File): Observable<ApiResponse<Company>> {
    const formData = new FormData();
    formData.append('logo', file);
    return this.http.put<ApiResponse<Company>>(`${this.apiUrl}/${id}/logo`, formData);
  }
}
