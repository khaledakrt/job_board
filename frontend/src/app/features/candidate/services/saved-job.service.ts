import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';
import { SavedJobItem } from '../../../core/models/candidate-profile.model';

@Injectable({ providedIn: 'root' })
export class SavedJobService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/candidate/saved-jobs`;

  list(): Observable<ApiResponse<SavedJobItem[]>> {
    return this.http.get<ApiResponse<SavedJobItem[]>>(this.base);
  }

  save(jobId: string): Observable<ApiResponse<SavedJobItem>> {
    return this.http.post<ApiResponse<SavedJobItem>>(this.base, { jobId });
  }

  remove(id: string): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.base}/${id}`);
  }
}
