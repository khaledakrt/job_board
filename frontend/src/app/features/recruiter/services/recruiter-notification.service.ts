import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';
import { RecruiterNotification } from '../../../core/models/recruiter-notification.model';

@Injectable({ providedIn: 'root' })
export class RecruiterNotificationService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/recruiter/notifications`;

  readonly notifications = signal<RecruiterNotification[]>([]);
  readonly unreadCount = signal(0);
  readonly loading = signal(false);

  refresh(): Observable<ApiResponse<RecruiterNotification[]> & { meta?: { unreadCount: number } }> {
    this.loading.set(true);
    return this.http
      .get<ApiResponse<RecruiterNotification[]> & { meta?: { unreadCount: number } }>(
        this.apiUrl
      )
      .pipe(
        tap({
          next: (res) => {
            this.notifications.set(res.data || []);
            this.unreadCount.set(res.meta?.unreadCount ?? 0);
            this.loading.set(false);
          },
          error: () => this.loading.set(false),
        })
      );
  }

  markAsRead(id: string): Observable<ApiResponse<RecruiterNotification>> {
    return this.http.patch<ApiResponse<RecruiterNotification>>(`${this.apiUrl}/${id}/read`, {}).pipe(
      tap({
        next: () => {
          this.notifications.update((list) =>
            list.map((n) => (n.id === id ? { ...n, isRead: true } : n))
          );
          this.unreadCount.update((c) => Math.max(0, c - 1));
        },
      })
    );
  }

  markAllAsRead(): Observable<ApiResponse<{ marked: number }>> {
    return this.http.patch<ApiResponse<{ marked: number }>>(`${this.apiUrl}/read-all`, {}).pipe(
      tap({
        next: () => {
          this.notifications.update((list) => list.map((n) => ({ ...n, isRead: true })));
          this.unreadCount.set(0);
        },
      })
    );
  }
}
