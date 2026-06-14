import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { AdminSubscriptionPaymentRequest } from '../../../core/models/admin.model';
import { AdminService } from '../services/admin.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
  selector: 'app-admin-subscription-payments',
  standalone: true,
  imports: [DatePipe, DecimalPipe, TranslatePipe],
  templateUrl: './admin-subscription-payments.component.html',
  styleUrl: './admin-subscription-payments.component.css',
})
export class AdminSubscriptionPaymentsComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly i18n = inject(I18nService);

  readonly rows = signal<AdminSubscriptionPaymentRequest[]>([]);
  readonly loading = signal(false);
  readonly processingId = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.adminService.listSubscriptionPaymentRequests().subscribe({
      next: (response) => {
        this.rows.set(response.data || []);
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set(error?.error?.message || this.i18n.translate('admin.subscriptionPayments.loadError'));
        this.loading.set(false);
      },
    });
  }

  review(row: AdminSubscriptionPaymentRequest, action: 'approve' | 'reject'): void {
    this.processingId.set(row.id);
    this.error.set(null);
    const adminNote =
      action === 'approve'
        ? this.i18n.translate('admin.subscriptionPayments.approvedNote')
        : this.i18n.translate('admin.subscriptionPayments.rejectedNote');

    this.adminService.reviewSubscriptionPaymentRequest(row.id, action, adminNote).subscribe({
      next: () => {
        this.processingId.set(null);
        this.load();
      },
      error: (error) => {
        this.error.set(error?.error?.message || this.i18n.translate('admin.subscriptionPayments.reviewError'));
        this.processingId.set(null);
      },
    });
  }

  statusLabel(status: string): string {
    return this.i18n.translate(`subscription.status.${status}`);
  }
}
