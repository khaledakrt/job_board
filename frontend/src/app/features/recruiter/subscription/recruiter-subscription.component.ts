import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { APP_ROUTES } from '../../../core/constants/routes.constant';
import {
  RecruiterSubscriptionOverview,
  SubscriptionPlan,
} from '../../../core/models/subscription-payment.model';
import { SubscriptionPaymentService } from '../services/subscription-payment.service';
import { RecruiterContextService } from '../services/recruiter-context.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
  selector: 'app-recruiter-subscription',
  standalone: true,
  imports: [DatePipe, DecimalPipe, RouterLink, TranslatePipe],
  templateUrl: './recruiter-subscription.component.html',
  styleUrl: './recruiter-subscription.component.css',
})
export class RecruiterSubscriptionComponent implements OnInit {
  private readonly subscriptionService = inject(SubscriptionPaymentService);
  readonly context = inject(RecruiterContextService);
  private readonly i18n = inject(I18nService);
  readonly routes = APP_ROUTES;

  readonly overview = signal<RecruiterSubscriptionOverview | null>(null);
  readonly loading = signal(false);
  readonly submittingPlanId = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.subscriptionService.getOverview().subscribe({
      next: (response) => {
        this.overview.set(response.data ?? null);
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set(error?.error?.message || this.i18n.translate('recruiter.subscription.loadError'));
        this.loading.set(false);
      },
    });
  }

  choosePlan(plan: SubscriptionPlan): void {
    if (!this.context.isOwner()) {
      this.error.set(this.i18n.translate('recruiter.subscription.ownerOnlyPayment'));
      return;
    }

    this.submittingPlanId.set(plan.id);
    this.error.set(null);
    this.subscriptionService.createPaymentRequest(plan.id).subscribe({
      next: (response) => {
        const paymentRequest = response.data;
        this.submittingPlanId.set(null);
        if (!paymentRequest) {
          this.error.set(this.i18n.translate('recruiter.subscription.invalidPaymentResponse'));
          return;
        }
        this.overview.update((current) => {
          return current ? { ...current, latestPaymentRequest: paymentRequest } : current;
        });
        if (paymentRequest.paymentUrl) {
          window.location.href = paymentRequest.paymentUrl;
        }
      },
      error: (error) => {
        this.error.set(error?.error?.message || this.i18n.translate('recruiter.subscription.createPaymentError'));
        this.submittingPlanId.set(null);
      },
    });
  }

  periodLabel(durationMonths: number): string {
    return durationMonths === 12
      ? this.i18n.translate('recruiter.subscription.year')
      : this.i18n.translate('recruiter.subscription.month');
  }
}
