export type SubscriptionPolicyMode = 'free_all' | 'paid_required';

export interface SubscriptionPlan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  priceTnd: number;
  durationMonths: number;
  maxActiveJobs: number | null;
  isActive: boolean;
  sortOrder: number;
}

export interface SubscriptionSummary {
  id: string | null;
  planType: string | null;
  status: 'active' | 'canceled' | 'missing';
  currentPeriodEnd: string | null;
  isActive: boolean;
}

export interface SubscriptionPaymentRequest {
  id: string;
  companyId: string;
  companyName: string | null;
  plan: SubscriptionPlan | null;
  provider: 'konnect' | 'manual';
  status: 'pending' | 'payment_pending' | 'paid' | 'rejected' | 'failed' | 'canceled';
  amountTnd: number;
  currency: 'TND';
  paymentUrl: string | null;
  providerPaymentRef: string | null;
  payerEmail: string | null;
  payerPhone: string | null;
  adminNote: string | null;
  paidAt: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RecruiterSubscriptionOverview {
  mode: SubscriptionPolicyMode;
  company: { id: string; name: string };
  subscription: SubscriptionSummary;
  canPublish: boolean;
  plans: SubscriptionPlan[];
  latestPaymentRequest: SubscriptionPaymentRequest | null;
  onlinePaymentConfigured: boolean;
}
