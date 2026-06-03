import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';
import { PublicCompanyPageData } from '../../../core/models/public-company.model';

@Injectable({ providedIn: 'root' })
export class PublicCompanyService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/companies`;

  getPublicProfile(
    companyId: string,
    page = 1,
    limit = 50
  ): Observable<ApiResponse<PublicCompanyPageData>> {
    return this.http.get<ApiResponse<PublicCompanyPageData>>(
      `${this.apiUrl}/${companyId}/public`,
      { params: { page, limit } }
    );
  }
}
