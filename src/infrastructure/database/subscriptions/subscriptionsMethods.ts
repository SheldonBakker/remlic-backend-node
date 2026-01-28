import type {
  ISubscription,
  ISubscriptionWithPackage,
  ICreateSubscriptionRequest,
  IUpdateSubscriptionRequest,
  ISubscriptionsFilters,
  IUserPermissions,
  ICreateSubscriptionFromPaystack,
} from './types.js';
import { supabaseAdmin } from '../supabaseClient.js';
import { HttpError } from '../../../shared/types/errors/appError.js';
import { HTTP_STATUS } from '../../../shared/constants/httpStatus.js';
import { Logger } from '../../../shared/utils/logger.js';
import { PaginationUtil, type ICursorParams, type IPaginatedResult } from '../../../shared/utils/pagination.js';
import { buildPartialUpdate } from '../../../shared/utils/updateBuilder.js';

export default class SubscriptionsService {
  public static async getSubscriptions(
    params: ICursorParams,
    filters: ISubscriptionsFilters = {},
  ): Promise<IPaginatedResult<ISubscriptionWithPackage>> {
    const cursor = PaginationUtil.decodeCursor(params.cursor);

    let query = supabaseAdmin
      .from('app_subscriptions')
      .select('*, app_packages(*, app_permissions(*))');

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.profile_id) {
      query = query.eq('profile_id', filters.profile_id);
    }

    query = query
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(params.limit);

    if (cursor) {
      query = query.or(`created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`);
    }

    const { data, error } = await query;

    if (error) {
      Logger.error('Failed to fetch subscriptions', 'SUBSCRIPTIONS_SERVICE', { error: error.message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to fetch subscriptions');
    }

    const items = data as ISubscriptionWithPackage[];
    const pagination = PaginationUtil.buildPagination(items, params.limit);

    return { items, pagination };
  }

  public static async getSubscriptionById(subscriptionId: string): Promise<ISubscriptionWithPackage> {
    const { data, error } = await supabaseAdmin
      .from('app_subscriptions')
      .select('*, app_packages(*, app_permissions(*))')
      .eq('id', subscriptionId)
      .single();

    if (error || !data) {
      Logger.warn('Subscription not found', 'SUBSCRIPTIONS_SERVICE', { subscriptionId });
      throw new HttpError(HTTP_STATUS.NOT_FOUND, 'Subscription not found');
    }

    return data as ISubscriptionWithPackage;
  }

  public static async getUserSubscriptions(
    userId: string,
    params: ICursorParams,
  ): Promise<IPaginatedResult<ISubscriptionWithPackage>> {
    const cursor = PaginationUtil.decodeCursor(params.cursor);

    let query = supabaseAdmin
      .from('app_subscriptions')
      .select('*, app_packages(*, app_permissions(*))')
      .eq('profile_id', userId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(params.limit);

    if (cursor) {
      query = query.or(`created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`);
    }

    const { data, error } = await query;

    if (error) {
      Logger.error('Failed to fetch user subscriptions', 'SUBSCRIPTIONS_SERVICE', { error: error.message, userId });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to fetch subscriptions');
    }

    const items = data as ISubscriptionWithPackage[];
    const pagination = PaginationUtil.buildPagination(items, params.limit);

    return { items, pagination };
  }

  public static async getUserPermissions(userId: string): Promise<IUserPermissions> {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabaseAdmin
      .from('app_subscriptions')
      .select('*, app_packages(*, app_permissions(*))')
      .eq('profile_id', userId)
      .in('status', ['active', 'cancelled'])
      .lte('start_date', today)
      .gte('end_date', today);

    if (error) {
      Logger.error('Failed to fetch user permissions', 'SUBSCRIPTIONS_SERVICE', { error: error.message, userId });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to fetch permissions');
    }

    const subscriptions = data as ISubscriptionWithPackage[];

    const permissions: IUserPermissions = {
      psira_access: false,
      firearm_access: false,
      vehicle_access: false,
      certificate_access: false,
      drivers_access: false,
      active_subscriptions: subscriptions.length,
    };

    for (const sub of subscriptions) {
      const perm = sub.app_packages.app_permissions;
      permissions.psira_access = permissions.psira_access || perm.psira_access;
      permissions.firearm_access = permissions.firearm_access || perm.firearm_access;
      permissions.vehicle_access = permissions.vehicle_access || perm.vehicle_access;
      permissions.certificate_access = permissions.certificate_access || perm.certificate_access;
      permissions.drivers_access = permissions.drivers_access || perm.drivers_access;
    }

    return permissions;
  }

  public static async createSubscription(data: ICreateSubscriptionRequest): Promise<ISubscription> {
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', data.profile_id)
      .single();

    if (profileError) {
      Logger.warn('Profile not found for subscription creation', 'SUBSCRIPTIONS_SERVICE', { profile_id: data.profile_id });
      throw new HttpError(HTTP_STATUS.BAD_REQUEST, 'Invalid profile ID');
    }

    const { error: packageError } = await supabaseAdmin
      .from('app_packages')
      .select('id')
      .eq('id', data.package_id)
      .eq('is_active', true)
      .single();

    if (packageError) {
      Logger.warn('Package not found or inactive for subscription creation', 'SUBSCRIPTIONS_SERVICE', { package_id: data.package_id });
      throw new HttpError(HTTP_STATUS.BAD_REQUEST, 'Invalid or inactive package ID');
    }

    const { data: subscription, error } = await supabaseAdmin
      .from('app_subscriptions')
      .insert({
        profile_id: data.profile_id,
        package_id: data.package_id,
        start_date: data.start_date,
        end_date: data.end_date,
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      Logger.error('Failed to create subscription', 'SUBSCRIPTIONS_SERVICE', { error: error.message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to create subscription');
    }

    return subscription as ISubscription;
  }

  private static async getExistingSubscription(subscriptionId: string): Promise<ISubscription> {
    const { data, error } = await supabaseAdmin
      .from('app_subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .single();

    if (error || !data) {
      Logger.warn('Subscription not found for update', 'SUBSCRIPTIONS_SERVICE', { subscriptionId });
      throw new HttpError(HTTP_STATUS.NOT_FOUND, 'Subscription not found');
    }

    return data as ISubscription;
  }

  private static async validateActivePackage(packageId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('app_packages')
      .select('id')
      .eq('id', packageId)
      .eq('is_active', true)
      .single();

    if (error) {
      Logger.warn('Package not found for subscription update', 'SUBSCRIPTIONS_SERVICE', { package_id: packageId });
      throw new HttpError(HTTP_STATUS.BAD_REQUEST, 'Invalid or inactive package ID');
    }
  }

  public static async updateSubscription(
    subscriptionId: string,
    data: IUpdateSubscriptionRequest,
  ): Promise<ISubscription> {
    const existing = await this.getExistingSubscription(subscriptionId);

    if (data.package_id) {
      await this.validateActivePackage(data.package_id);
    }

    const startDate = data.start_date ?? existing.start_date;
    const endDate = data.end_date ?? existing.end_date;
    if (new Date(endDate) < new Date(startDate)) {
      throw new HttpError(HTTP_STATUS.BAD_REQUEST, 'End date must be on or after start date');
    }

    const updateData = buildPartialUpdate(data, ['package_id', 'start_date', 'end_date', 'status']);

    const { data: subscription, error: updateError } = await supabaseAdmin
      .from('app_subscriptions')
      .update(updateData)
      .eq('id', subscriptionId)
      .select()
      .single();

    if (updateError) {
      Logger.error('Failed to update subscription', 'SUBSCRIPTIONS_SERVICE', { error: updateError.message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to update subscription');
    }

    return subscription as ISubscription;
  }

  public static async cancelSubscription(subscriptionId: string): Promise<void> {
    const { error: findError } = await supabaseAdmin
      .from('app_subscriptions')
      .select('id')
      .eq('id', subscriptionId)
      .single();

    if (findError) {
      Logger.warn('Subscription not found for cancellation', 'SUBSCRIPTIONS_SERVICE', { subscriptionId });
      throw new HttpError(HTTP_STATUS.NOT_FOUND, 'Subscription not found');
    }

    const { error: updateError } = await supabaseAdmin
      .from('app_subscriptions')
      .update({ status: 'cancelled' })
      .eq('id', subscriptionId);

    if (updateError) {
      Logger.error('Failed to cancel subscription', 'SUBSCRIPTIONS_SERVICE', { error: updateError.message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to cancel subscription');
    }
  }

  /**
   * Find subscription by Paystack subscription code
   */
  public static async getByPaystackCode(subscriptionCode: string): Promise<ISubscriptionWithPackage | null> {
    const { data, error } = await supabaseAdmin
      .from('app_subscriptions')
      .select('*, app_packages(*, app_permissions(*))')
      .eq('paystack_subscription_code', subscriptionCode)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      Logger.error('Failed to fetch subscription by Paystack code', 'SUBSCRIPTIONS_SERVICE', { error: error.message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to fetch subscription');
    }

    return data as ISubscriptionWithPackage;
  }

  /**
   * Create subscription from Paystack webhook data
   */
  public static async createFromPaystack(data: ICreateSubscriptionFromPaystack): Promise<ISubscription> {
    // Calculate start and end dates based on package type
    const startDate = new Date();
    const endDate = new Date(data.current_period_end);

    const { data: subscription, error } = await supabaseAdmin
      .from('app_subscriptions')
      .insert({
        profile_id: data.profile_id,
        package_id: data.package_id,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        status: 'active',
        paystack_subscription_code: data.paystack_subscription_code,
        paystack_customer_code: data.paystack_customer_code,
        paystack_email_token: data.paystack_email_token,
        paystack_transaction_reference: data.paystack_transaction_reference,
        current_period_end: data.current_period_end,
      })
      .select()
      .single();

    if (error) {
      Logger.error('Failed to create subscription from Paystack', 'SUBSCRIPTIONS_SERVICE', { error: error.message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to create subscription');
    }

    return subscription as ISubscription;
  }

  /**
   * Renew subscription after successful charge
   */
  public static async renewSubscription(
    subscriptionCode: string,
    newPeriodEnd: string,
  ): Promise<ISubscription> {
    const existing = await this.getByPaystackCode(subscriptionCode);
    if (!existing) {
      throw new HttpError(HTTP_STATUS.NOT_FOUND, 'Subscription not found');
    }

    const endDate = new Date(newPeriodEnd);

    const { data: subscription, error } = await supabaseAdmin
      .from('app_subscriptions')
      .update({
        end_date: endDate.toISOString().split('T')[0],
        current_period_end: newPeriodEnd,
        status: 'active',
      })
      .eq('paystack_subscription_code', subscriptionCode)
      .select()
      .single();

    if (error) {
      Logger.error('Failed to renew subscription', 'SUBSCRIPTIONS_SERVICE', { error: error.message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to renew subscription');
    }

    return subscription as ISubscription;
  }

  public static async markCancelledByPaystack(subscriptionCode: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('app_subscriptions')
      .update({ status: 'cancelled' })
      .eq('paystack_subscription_code', subscriptionCode);

    if (error) {
      Logger.error('Failed to cancel subscription from Paystack', 'SUBSCRIPTIONS_SERVICE', { error: error.message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to cancel subscription');
    }
  }

  public static async markRefunded(subscriptionId: string): Promise<ISubscription> {
    const { data: subscription, error } = await supabaseAdmin
      .from('app_subscriptions')
      .update({
        status: 'refunded',
        refunded_at: new Date().toISOString(),
      })
      .eq('id', subscriptionId)
      .select()
      .single();

    if (error) {
      Logger.error('Failed to mark subscription as refunded', 'SUBSCRIPTIONS_SERVICE', { error: error.message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to process refund');
    }

    return subscription as ISubscription;
  }

  public static async getUserActiveSubscription(userId: string): Promise<ISubscriptionWithPackage | null> {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabaseAdmin
      .from('app_subscriptions')
      .select('*, app_packages(*, app_permissions(*))')
      .eq('profile_id', userId)
      .in('status', ['active', 'cancelled'])
      .lte('start_date', today)
      .gte('end_date', today)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      Logger.error('Failed to fetch user active subscription', 'SUBSCRIPTIONS_SERVICE', { error: error.message, userId });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to fetch subscription');
    }

    return data as ISubscriptionWithPackage;
  }

  public static async getProfileIdsWithValidSubscription(profileIds: string[]): Promise<Set<string>> {
    if (profileIds.length === 0) {
      return new Set();
    }

    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabaseAdmin
      .from('app_subscriptions')
      .select('profile_id')
      .in('profile_id', profileIds)
      .in('status', ['active', 'cancelled'])
      .lte('start_date', today)
      .gte('end_date', today);

    if (error) {
      Logger.error('Failed to fetch valid subscriptions', 'SUBSCRIPTIONS_SERVICE', { error: error.message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to check subscriptions');
    }

    const subscriptions = data as Array<{ profile_id: string }>;
    return new Set(subscriptions.map((s) => s.profile_id));
  }

  public static async getExpiredActiveSubscriptions(): Promise<Pick<ISubscription, 'id'>[]> {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabaseAdmin
      .from('app_subscriptions')
      .select('id')
      .eq('status', 'active')
      .lt('end_date', today);

    if (error) {
      Logger.error('Failed to fetch expired active subscriptions', 'SUBSCRIPTIONS_SERVICE', { error: error.message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to fetch expired subscriptions');
    }

    return data as Pick<ISubscription, 'id'>[];
  }

  public static async bulkExpireSubscriptions(subscriptionIds: string[]): Promise<number> {
    if (subscriptionIds.length === 0) {
      return 0;
    }

    const { data, error } = await supabaseAdmin
      .from('app_subscriptions')
      .update({ status: 'expired' })
      .in('id', subscriptionIds)
      .select('id');

    if (error) {
      Logger.error('Failed to bulk expire subscriptions', 'SUBSCRIPTIONS_SERVICE', { error: error.message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to expire subscriptions');
    }

    return data.length;
  }
}
