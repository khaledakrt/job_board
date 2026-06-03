import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';
import {
  InviteTeamMemberPayload,
  TeamMember,
  UpdateTeamMemberPayload,
} from '../../../core/models/recruiter.model';

@Injectable({ providedIn: 'root' })
export class TeamService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/recruiter/team`;

  list(): Observable<ApiResponse<TeamMember[]>> {
    return this.http.get<ApiResponse<TeamMember[]>>(this.apiUrl);
  }

  invite(payload: InviteTeamMemberPayload): Observable<ApiResponse<TeamMember>> {
    return this.http.post<ApiResponse<TeamMember>>(this.apiUrl, payload);
  }

  update(memberId: string, payload: UpdateTeamMemberPayload): Observable<ApiResponse<TeamMember>> {
    return this.http.patch<ApiResponse<TeamMember>>(`${this.apiUrl}/${memberId}`, payload);
  }

  remove(memberId: string): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.apiUrl}/${memberId}`);
  }
}
