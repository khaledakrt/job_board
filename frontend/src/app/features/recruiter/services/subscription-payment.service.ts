import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';
import {
  RecruiterSubscriptionOverview,
  SubscriptionPaymentRequest,
} from '../../../core/models/subscription-payment.model';

@Injectable({ providedIn: 'root' })
export class SubscriptionPaymentService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/recruiter/subscription`;

  getOverview(): Observable<ApiResponse<RecruiterSubscriptionOverview>> {
    return this.http.get<ApiResponse<RecruiterSubscriptionOverview>>(`${this.base}/overview`);
  }

  createPaymentRequest(planId: string): Observable<ApiResponse<SubscriptionPaymentRequest>> {
    return this.http.post<ApiResponse<SubscriptionPaymentRequest>>(`${this.base}/payment-requests`, {
      planId,
      provider: 'konnect',
    });
  }
}
