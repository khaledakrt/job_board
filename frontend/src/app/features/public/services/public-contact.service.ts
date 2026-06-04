import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface ContactFormPayload {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export interface ContactFormResponse {
  success: boolean;
  message: string;
  data?: { sent: boolean };
}

@Injectable({ providedIn: 'root' })
export class PublicContactService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/public`;

  submit(payload: ContactFormPayload): Observable<ContactFormResponse> {
    return this.http.post<ContactFormResponse>(`${this.base}/contact`, payload);
  }
}
