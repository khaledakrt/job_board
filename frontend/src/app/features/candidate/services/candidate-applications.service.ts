import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';
import { Application, ApplicationDetail } from '../../../core/models/application.model';

@Injectable({ providedIn: 'root' })
export class CandidateApplicationsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/candidate/applications`;

  list(): Observable<ApiResponse<Application[]>> {
    return this.http.get<ApiResponse<Application[]>>(this.base);
  }

  getById(id: string): Observable<ApiResponse<ApplicationDetail>> {
    return this.http.get<ApiResponse<ApplicationDetail>>(`${this.base}/${id}`);
  }

  listAppliedJobIds(): Observable<ApiResponse<string[]>> {
    return this.http.get<ApiResponse<string[]>>(`${this.base}/applied-job-ids`);
  }
}
