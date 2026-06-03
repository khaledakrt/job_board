import { DatePipe } from '@angular/common';
import {
  Component,
  HostListener,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { interval, Subscription, switchMap } from 'rxjs';
import { APP_ROUTES } from '../../../../core/constants/routes.constant';
import { RecruiterNotification } from '../../../../core/models/recruiter-notification.model';
import { resolveUploadUrl } from '../../../../core/utils/asset-url.util';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { RecruiterNotificationService } from '../../services/recruiter-notification.service';

@Component({
  selector: 'app-recruiter-notification-bell',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './notification-bell.component.html',
  styleUrl: './notification-bell.component.css',
})
export class RecruiterNotificationBellComponent implements OnInit, OnDestroy {
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly notificationService = inject(RecruiterNotificationService);
  private readonly router = inject(Router);
  readonly routes = APP_ROUTES;

  readonly open = signal(false);
  readonly detailOpen = signal(false);
  readonly selectedNotification = signal<RecruiterNotification | null>(null);
  readonly notifications = this.notificationService.notifications;
  readonly unreadCount = this.notificationService.unreadCount;
  readonly loading = this.notificationService.loading;

  private pollSub?: Subscription;

  ngOnInit(): void {
    this.notificationService.refresh().subscribe();
    this.pollSub = interval(20_000)
      .pipe(switchMap(() => this.notificationService.refresh()))
      .subscribe();
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    if (!this.detailOpen()) {
      this.open.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.detailOpen()) {
      this.closeDetail();
    } else {
      this.open.set(false);
    }
  }

  togglePanel(event: MouseEvent): void {
    event.stopPropagation();
    const next = !this.open();
    this.open.set(next);
    if (next) {
      this.notificationService.refresh().subscribe();
    }
  }

  avatarUrl(notification: RecruiterNotification): string | null {
    return resolveUploadUrl(notification.candidateAvatarUrl);
  }

  initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
  }

  openNotification(event: MouseEvent, notification: RecruiterNotification): void {
    event.stopPropagation();
    if (!notification.isRead) {
      this.notificationService.markAsRead(notification.id).subscribe();
    }
    this.selectedNotification.set(notification);
    this.detailOpen.set(true);
    this.open.set(false);
  }

  closeDetail(event?: MouseEvent): void {
    event?.stopPropagation();
    this.detailOpen.set(false);
    this.selectedNotification.set(null);
  }

  goToApplication(event: MouseEvent, notification: RecruiterNotification): void {
    event.stopPropagation();
    this.closeDetail();
    void this.router.navigate([this.routes.RECRUITER.ATS], {
      queryParams: {
        jobId: notification.jobId,
        applicationId: notification.applicationId,
      },
    });
  }

  goToJob(event: MouseEvent, notification: RecruiterNotification): void {
    event.stopPropagation();
    this.closeDetail();
    void this.router.navigate(['/recruiter/jobs', notification.jobId]);
  }

  async markAllRead(event: MouseEvent): Promise<void> {
    event.stopPropagation();
    const ok = await this.confirmDialog.confirm({
      title: 'Marquer tout comme lu',
      message: 'Marquer toutes les notifications comme lues ?',
      confirmLabel: 'Confirmer',
    });
    if (!ok) return;
    this.notificationService.markAllAsRead().subscribe();
  }

  stopPropagation(event: MouseEvent): void {
    event.stopPropagation();
  }
}
