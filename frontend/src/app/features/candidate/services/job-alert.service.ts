import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';
import { JobAlertItem } from '../../../core/models/candidate-profile.model';

@Injectable({ providedIn: 'root' })
export class JobAlertService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/candidate/job-alerts`;

  list(): Observable<ApiResponse<JobAlertItem[]>> {
    return this.http.get<ApiResponse<JobAlertItem[]>>(this.base);
  }

  create(searchFilters: Record<string, unknown>): Observable<ApiResponse<JobAlertItem>> {
    return this.http.post<ApiResponse<JobAlertItem>>(this.base, { searchFilters });
  }

  remove(id: string): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.base}/${id}`);
  }
}
