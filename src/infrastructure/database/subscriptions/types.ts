import type { IPackageWithPermission } from '../packages/types.js';

export type SubscriptionStatus = 'active' | 'expired' | 'cancelled' | 'refunded';

export interface ISubscription {
  id: string;
  profile_id: string;
  package_id: string;
  start_date: string;
  end_date: string;
  status: SubscriptionStatus;
  paystack_subscription_code: string | null;
  paystack_customer_code: string | null;
  paystack_email_token: string | null;
  paystack_transaction_reference: string | null;
  current_period_end: string | null;
  refunded_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ISubscriptionWithPackage extends ISubscription {
  app_packages: IPackageWithPermission;
}

export interface ICreateSubscriptionRequest {
  profile_id: string;
  package_id: string;
  start_date: string;
  end_date: string;
}

export interface IUpdateSubscriptionRequest {
  package_id?: string;
  start_date?: string;
  end_date?: string;
  status?: SubscriptionStatus;
}

export interface ISubscriptionsFilters {
  status?: SubscriptionStatus;
  profile_id?: string;
}

export interface IUserPermissions {
  psira_access: boolean;
  firearm_access: boolean;
  vehicle_access: boolean;
  certificate_access: boolean;
  drivers_access: boolean;
  active_subscriptions: number;
}

export interface IInitializeSubscriptionRequest {
  package_id: string;
  callback_url: string;
}

export interface IInitializeSubscriptionResponse {
  authorization_url: string;
  reference: string;
  access_code: string;
}

export interface IChangePlanRequest {
  new_package_id: string;
  callback_url: string;
}

export interface ICreateSubscriptionFromPaystack {
  profile_id: string;
  package_id: string;
  paystack_subscription_code: string;
  paystack_customer_code: string;
  paystack_email_token: string;
  paystack_transaction_reference: string;
  current_period_end: string;
}
