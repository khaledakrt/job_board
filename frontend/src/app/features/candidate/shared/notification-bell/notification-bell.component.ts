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
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { CandidateNotification } from '../../../../core/models/candidate-notification.model';
import { CandidateNotificationService } from '../../services/candidate-notification.service';

@Component({
  selector: 'app-candidate-notification-bell',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './notification-bell.component.html',
  styleUrl: './notification-bell.component.css',
})
export class CandidateNotificationBellComponent implements OnInit, OnDestroy {
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly notificationService = inject(CandidateNotificationService);
  private readonly router = inject(Router);
  readonly routes = APP_ROUTES;

  readonly open = signal(false);
  readonly detailOpen = signal(false);
  readonly selectedNotification = signal<CandidateNotification | null>(null);
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

  openNotification(event: MouseEvent, notification: CandidateNotification): void {
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

  goToDashboard(event: MouseEvent): void {
    event.stopPropagation();
    this.closeDetail();
    void this.router.navigate([this.routes.CANDIDATE.DASHBOARD]);
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
