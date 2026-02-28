export interface IPaystackInitializeRequest {
  email: string;
  amount: number;
  plan?: string;
  callback_url?: string;
  reference?: string;
  metadata?: Record<string, unknown>;
  channels?: string[];
}

export interface IPaystackTransactionData {
  authorization_url: string;
  access_code: string;
  reference: string;
}

export interface IPaystackInitializeResponse {
  status: boolean;
  message: string;
  data: IPaystackTransactionData;
}

export interface IPaystackAuthorization {
  authorization_code: string;
  bin: string;
  last4: string;
  exp_month: string;
  exp_year: string;
  channel: string;
  card_type: string;
  bank: string;
  country_code: string;
  brand: string;
  reusable: boolean;
  signature: string;
}

export interface IPaystackCustomer {
  id: number;
  email: string;
  customer_code: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  metadata: Record<string, unknown> | null;
}

export interface IPaystackPlan {
  id: number;
  name: string;
  plan_code: string;
  amount: number;
  interval: string;
}

export interface IPaystackVerifyData {
  id: number;
  status: string;
  reference: string;
  amount: number;
  message: string | null;
  gateway_response: string;
  paid_at: string;
  created_at: string;
  channel: string;
  currency: string;
  metadata: Record<string, unknown> | null;
  authorization: IPaystackAuthorization;
  customer: IPaystackCustomer;
  plan: IPaystackPlan | null;
  subscription?: {
    subscription_code: string;
    email_token: string;
  };
}

export interface IPaystackVerifyResponse {
  status: boolean;
  message: string;
  data: IPaystackVerifyData;
}
export interface IPaystackSubscriptionData {
  id: number;
  subscription_code: string;
  email_token: string;
  customer: IPaystackCustomer;
  plan: IPaystackPlan;
  status: string;
  quantity: number;
  amount: number;
  next_payment_date: string;
  start: number;
  created_at: string;
}

export interface IPaystackSubscriptionResponse {
  status: boolean;
  message: string;
  data: IPaystackSubscriptionData;
}

export interface IPaystackDisableSubscriptionResponse {
  status: boolean;
  message: string;
}

export type PaystackWebhookEvent =
  | 'subscription.create'
  | 'subscription.disable'
  | 'subscription.not_renew'
  | 'subscription.expiring_cards'
  | 'charge.success'
  | 'invoice.create'
  | 'invoice.payment_failed'
  | 'invoice.update';

export interface IPaystackWebhookPayload {
  event: PaystackWebhookEvent;
  data: {
    id: number;
    status: string;
    reference?: string;
    amount: number;
    paid_at?: string;
    created_at: string;
    channel?: string;
    currency?: string;
    customer: IPaystackCustomer;
    plan?: IPaystackPlan;
    subscription_code?: string;
    email_token?: string;
    next_payment_date?: string;
    authorization?: IPaystackAuthorization;
    metadata?: Record<string, unknown>;
  };
}

export interface IPaystackResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface IActivateSubscriptionData {
  profile_id: string;
  package_id: string;
  paystack_subscription_code: string;
  paystack_customer_code: string;
  paystack_email_token: string;
  current_period_end: string;
}

export interface IPaystackRefundRequest {
  transaction: string;
  amount?: number;
  merchant_note?: string;
}

export interface IPaystackRefundData {
  id: number;
  status: string;
  amount: number;
  currency: string;
  created_at: string;
}

export interface IPaystackRefundResponse {
  status: boolean;
  message: string;
  data: IPaystackRefundData;
}
