import type {
  ISubscription,
  ISubscriptionWithPackage,
  ICreateSubscriptionRequest,
  IUpdateSubscriptionRequest,
  ISubscriptionsFilters,
  IUserPermissions,
  ICreateSubscriptionFromPaystack,
} from './types.js';
import db from '../drizzleClient.js';
import { appSubscriptions, appPackages, appPermissions, profiles } from '../schema/index.js';
import { eq, or, lt, and, desc, lte, gte, inArray, type SQL } from 'drizzle-orm';
import { HttpError } from '../../../shared/types/errors/appError.js';
import { HTTP_STATUS } from '../../../shared/constants/httpStatus.js';
import { Logger } from '../../../shared/utils/logging/logger.js';
import { PaginationUtil, type ICursorParams, type IPaginatedResult } from '../../../shared/utils/pagination.js';
import { buildPartialUpdate } from '../../../shared/utils/updateBuilder.js';

interface JoinedSubscriptionRow {
  app_subscriptions: typeof appSubscriptions.$inferSelect;
  app_packages: typeof appPackages.$inferSelect;
  app_permissions: typeof appPermissions.$inferSelect;
}

export default class SubscriptionsService {
  public static async getSubscriptions(
    params: ICursorParams,
    filters: ISubscriptionsFilters = {},
  ): Promise<IPaginatedResult<ISubscriptionWithPackage>> {
    try {
      const cursor = PaginationUtil.decodeCursor(params.cursor);

      const conditions: SQL[] = [];

      if (filters.status) {
        conditions.push(eq(appSubscriptions.status, filters.status));
      }

      if (filters.profile_id) {
        conditions.push(eq(appSubscriptions.profile_id, filters.profile_id));
      }

      if (cursor) {
        const cursorCondition = or(
          lt(appSubscriptions.created_at, new Date(cursor.created_at)),
          and(eq(appSubscriptions.created_at, new Date(cursor.created_at)), lt(appSubscriptions.id, cursor.id)),
        );
        if (cursorCondition) {
          conditions.push(cursorCondition);
        }
      }

      const results = await db
        .select()
        .from(appSubscriptions)
        .innerJoin(appPackages, eq(appSubscriptions.package_id, appPackages.id))
        .innerJoin(appPermissions, eq(appPackages.permission_id, appPermissions.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(appSubscriptions.created_at), desc(appSubscriptions.id))
        .limit(params.limit);

      const items = results.map((row) => SubscriptionsService.mapToSubWithPkg(row));
      const pagination = PaginationUtil.buildPagination(items, params.limit);

      return { items, pagination };
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      Logger.error('Failed to fetch subscriptions', 'SUBSCRIPTIONS_SERVICE', { error: (error as Error).message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to fetch subscriptions');
    }
  }

  public static async getSubscriptionById(subscriptionId: string): Promise<ISubscriptionWithPackage> {
    try {
      const [result] = await db
        .select()
        .from(appSubscriptions)
        .innerJoin(appPackages, eq(appSubscriptions.package_id, appPackages.id))
        .innerJoin(appPermissions, eq(appPackages.permission_id, appPermissions.id))
        .where(eq(appSubscriptions.id, subscriptionId))
        .limit(1);

      if (!result) {
        Logger.warn('Subscription not found', 'SUBSCRIPTIONS_SERVICE', { subscriptionId });
        throw new HttpError(HTTP_STATUS.NOT_FOUND, 'Subscription not found');
      }

      return SubscriptionsService.mapToSubWithPkg(result);
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      Logger.error('Failed to fetch subscription', 'SUBSCRIPTIONS_SERVICE', { error: (error as Error).message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to fetch subscription');
    }
  }

  public static async getUserSubscriptions(
    userId: string,
    params: ICursorParams,
  ): Promise<IPaginatedResult<ISubscriptionWithPackage>> {
    try {
      const cursor = PaginationUtil.decodeCursor(params.cursor);

      const conditions: SQL[] = [eq(appSubscriptions.profile_id, userId)];

      if (cursor) {
        const cursorCondition = or(
          lt(appSubscriptions.created_at, new Date(cursor.created_at)),
          and(eq(appSubscriptions.created_at, new Date(cursor.created_at)), lt(appSubscriptions.id, cursor.id)),
        );
        if (cursorCondition) {
          conditions.push(cursorCondition);
        }
      }

      const results = await db
        .select()
        .from(appSubscriptions)
        .innerJoin(appPackages, eq(appSubscriptions.package_id, appPackages.id))
        .innerJoin(appPermissions, eq(appPackages.permission_id, appPermissions.id))
        .where(and(...conditions))
        .orderBy(desc(appSubscriptions.created_at), desc(appSubscriptions.id))
        .limit(params.limit);

      const items = results.map((row) => SubscriptionsService.mapToSubWithPkg(row));
      const pagination = PaginationUtil.buildPagination(items, params.limit);

      return { items, pagination };
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      Logger.error('Failed to fetch user subscriptions', 'SUBSCRIPTIONS_SERVICE', { error: (error as Error).message, userId });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to fetch subscriptions');
    }
  }

  public static async getUserPermissions(userId: string): Promise<IUserPermissions> {
    try {
      const today = new Date().toISOString().split('T')[0] ?? '';

      const results = await db
        .select()
        .from(appSubscriptions)
        .innerJoin(appPackages, eq(appSubscriptions.package_id, appPackages.id))
        .innerJoin(appPermissions, eq(appPackages.permission_id, appPermissions.id))
        .where(and(
          eq(appSubscriptions.profile_id, userId),
          inArray(appSubscriptions.status, ['active', 'cancelled']),
          lte(appSubscriptions.start_date, today),
          gte(appSubscriptions.end_date, today),
        ));

      const subscriptions = results.map((row) => SubscriptionsService.mapToSubWithPkg(row));

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
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      Logger.error('Failed to fetch user permissions', 'SUBSCRIPTIONS_SERVICE', { error: (error as Error).message, userId });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to fetch permissions');
    }
  }

  public static async createSubscription(data: ICreateSubscriptionRequest): Promise<ISubscription> {
    try {
      const [profileExists] = await db
        .select({ id: profiles.id })
        .from(profiles)
        .where(eq(profiles.id, data.profile_id));

      if (!profileExists) {
        Logger.warn('Profile not found for subscription creation', 'SUBSCRIPTIONS_SERVICE', { profile_id: data.profile_id });
        throw new HttpError(HTTP_STATUS.BAD_REQUEST, 'Invalid profile ID');
      }

      const [packageExists] = await db
        .select({ id: appPackages.id })
        .from(appPackages)
        .where(and(eq(appPackages.id, data.package_id), eq(appPackages.is_active, true)));

      if (!packageExists) {
        Logger.warn('Package not found or inactive for subscription creation', 'SUBSCRIPTIONS_SERVICE', { package_id: data.package_id });
        throw new HttpError(HTTP_STATUS.BAD_REQUEST, 'Invalid or inactive package ID');
      }

      const [subscription] = await db
        .insert(appSubscriptions)
        .values({
          profile_id: data.profile_id,
          package_id: data.package_id,
          start_date: data.start_date,
          end_date: data.end_date,
          status: 'active',
        })
        .returning();

      if (!subscription) {
        throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to create subscription');
      }

      return SubscriptionsService.mapToSub(subscription);
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      Logger.error('Failed to create subscription', 'SUBSCRIPTIONS_SERVICE', { error: (error as Error).message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to create subscription');
    }
  }

  private static async getExistingSubscription(subscriptionId: string): Promise<ISubscription> {
    const [data] = await db
      .select()
      .from(appSubscriptions)
      .where(eq(appSubscriptions.id, subscriptionId));

    if (!data) {
      Logger.warn('Subscription not found for update', 'SUBSCRIPTIONS_SERVICE', { subscriptionId });
      throw new HttpError(HTTP_STATUS.NOT_FOUND, 'Subscription not found');
    }

    return SubscriptionsService.mapToSub(data);
  }

  private static async validateActivePackage(packageId: string): Promise<void> {
    const [existing] = await db
      .select({ id: appPackages.id })
      .from(appPackages)
      .where(and(eq(appPackages.id, packageId), eq(appPackages.is_active, true)));

    if (!existing) {
      Logger.warn('Package not found for subscription update', 'SUBSCRIPTIONS_SERVICE', { package_id: packageId });
      throw new HttpError(HTTP_STATUS.BAD_REQUEST, 'Invalid or inactive package ID');
    }
  }

  public static async updateSubscription(
    subscriptionId: string,
    data: IUpdateSubscriptionRequest,
  ): Promise<ISubscription> {
    try {
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

      const [subscription] = await db
        .update(appSubscriptions)
        .set(updateData)
        .where(eq(appSubscriptions.id, subscriptionId))
        .returning();

      if (!subscription) {
        throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to update subscription');
      }

      return SubscriptionsService.mapToSub(subscription);
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      Logger.error('Failed to update subscription', 'SUBSCRIPTIONS_SERVICE', { error: (error as Error).message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to update subscription');
    }
  }

  public static async cancelSubscription(subscriptionId: string): Promise<void> {
    try {
      const [existing] = await db
        .select({ id: appSubscriptions.id })
        .from(appSubscriptions)
        .where(eq(appSubscriptions.id, subscriptionId));

      if (!existing) {
        Logger.warn('Subscription not found for cancellation', 'SUBSCRIPTIONS_SERVICE', { subscriptionId });
        throw new HttpError(HTTP_STATUS.NOT_FOUND, 'Subscription not found');
      }

      await db
        .update(appSubscriptions)
        .set({ status: 'cancelled' })
        .where(eq(appSubscriptions.id, subscriptionId));
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      Logger.error('Failed to cancel subscription', 'SUBSCRIPTIONS_SERVICE', { error: (error as Error).message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to cancel subscription');
    }
  }

  public static async getByPaystackCode(subscriptionCode: string): Promise<ISubscriptionWithPackage | null> {
    try {
      const [result] = await db
        .select()
        .from(appSubscriptions)
        .innerJoin(appPackages, eq(appSubscriptions.package_id, appPackages.id))
        .innerJoin(appPermissions, eq(appPackages.permission_id, appPermissions.id))
        .where(eq(appSubscriptions.paystack_subscription_code, subscriptionCode))
        .limit(1);

      if (!result) {
        return null;
      }

      return SubscriptionsService.mapToSubWithPkg(result);
    } catch (error) {
      Logger.error('Failed to fetch subscription by Paystack code', 'SUBSCRIPTIONS_SERVICE', { error: (error as Error).message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to fetch subscription');
    }
  }

  public static async createFromPaystack(data: ICreateSubscriptionFromPaystack): Promise<ISubscription> {
    try {
      const startDate = new Date();
      const endDate = new Date(data.current_period_end);

      const [subscription] = await db
        .insert(appSubscriptions)
        .values({
          profile_id: data.profile_id,
          package_id: data.package_id,
          start_date: startDate.toISOString().split('T')[0] ?? '',
          end_date: endDate.toISOString().split('T')[0] ?? '',
          status: 'active',
          paystack_subscription_code: data.paystack_subscription_code,
          paystack_customer_code: data.paystack_customer_code,
          paystack_email_token: data.paystack_email_token,
          paystack_transaction_reference: data.paystack_transaction_reference,
          current_period_end: new Date(data.current_period_end),
        })
        .returning();

      if (!subscription) {
        throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to create subscription');
      }

      return SubscriptionsService.mapToSub(subscription);
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      Logger.error('Failed to create subscription from Paystack', 'SUBSCRIPTIONS_SERVICE', { error: (error as Error).message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to create subscription');
    }
  }

  public static async renewSubscription(
    subscriptionCode: string,
    newPeriodEnd: string,
  ): Promise<ISubscription> {
    try {
      const existing = await this.getByPaystackCode(subscriptionCode);
      if (!existing) {
        throw new HttpError(HTTP_STATUS.NOT_FOUND, 'Subscription not found');
      }

      const endDate = new Date(newPeriodEnd);

      const [subscription] = await db
        .update(appSubscriptions)
        .set({
          end_date: endDate.toISOString().split('T')[0] ?? '',
          current_period_end: new Date(newPeriodEnd),
          status: 'active',
        })
        .where(eq(appSubscriptions.paystack_subscription_code, subscriptionCode))
        .returning();

      if (!subscription) {
        throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to renew subscription');
      }

      return SubscriptionsService.mapToSub(subscription);
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      Logger.error('Failed to renew subscription', 'SUBSCRIPTIONS_SERVICE', { error: (error as Error).message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to renew subscription');
    }
  }

  public static async markCancelledByPaystack(subscriptionCode: string): Promise<void> {
    try {
      await db
        .update(appSubscriptions)
        .set({ status: 'cancelled' })
        .where(eq(appSubscriptions.paystack_subscription_code, subscriptionCode));
    } catch (error) {
      Logger.error('Failed to cancel subscription from Paystack', 'SUBSCRIPTIONS_SERVICE', { error: (error as Error).message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to cancel subscription');
    }
  }

  public static async markRefunded(subscriptionId: string): Promise<ISubscription> {
    try {
      const [subscription] = await db
        .update(appSubscriptions)
        .set({
          status: 'refunded',
          refunded_at: new Date(),
        })
        .where(eq(appSubscriptions.id, subscriptionId))
        .returning();

      if (!subscription) {
        throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to process refund');
      }

      return SubscriptionsService.mapToSub(subscription);
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      Logger.error('Failed to mark subscription as refunded', 'SUBSCRIPTIONS_SERVICE', { error: (error as Error).message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to process refund');
    }
  }

  public static async getUserActiveSubscription(userId: string): Promise<ISubscriptionWithPackage | null> {
    try {
      const today = new Date().toISOString().split('T')[0] ?? '';

      const [result] = await db
        .select()
        .from(appSubscriptions)
        .innerJoin(appPackages, eq(appSubscriptions.package_id, appPackages.id))
        .innerJoin(appPermissions, eq(appPackages.permission_id, appPermissions.id))
        .where(and(
          eq(appSubscriptions.profile_id, userId),
          inArray(appSubscriptions.status, ['active', 'cancelled']),
          lte(appSubscriptions.start_date, today),
          gte(appSubscriptions.end_date, today),
        ))
        .orderBy(desc(appSubscriptions.created_at))
        .limit(1);

      if (!result) {
        return null;
      }

      return SubscriptionsService.mapToSubWithPkg(result);
    } catch (error) {
      Logger.error('Failed to fetch user active subscription', 'SUBSCRIPTIONS_SERVICE', { error: (error as Error).message, userId });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to fetch subscription');
    }
  }

  public static async getProfileIdsWithValidSubscription(profileIds: string[]): Promise<Set<string>> {
    if (profileIds.length === 0) {
      return new Set();
    }

    try {
      const today = new Date().toISOString().split('T')[0] ?? '';

      const data = await db
        .select({ profile_id: appSubscriptions.profile_id })
        .from(appSubscriptions)
        .where(and(
          inArray(appSubscriptions.profile_id, profileIds),
          inArray(appSubscriptions.status, ['active', 'cancelled']),
          lte(appSubscriptions.start_date, today),
          gte(appSubscriptions.end_date, today),
        ));

      return new Set(data.map((s) => s.profile_id));
    } catch (error) {
      Logger.error('Failed to fetch valid subscriptions', 'SUBSCRIPTIONS_SERVICE', { error: (error as Error).message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to check subscriptions');
    }
  }

  public static async getExpiredActiveSubscriptions(): Promise<Pick<ISubscription, 'id'>[]> {
    try {
      const today = new Date().toISOString().split('T')[0] ?? '';

      const data = await db
        .select({ id: appSubscriptions.id })
        .from(appSubscriptions)
        .where(and(eq(appSubscriptions.status, 'active'), lt(appSubscriptions.end_date, today)));

      return data;
    } catch (error) {
      Logger.error('Failed to fetch expired active subscriptions', 'SUBSCRIPTIONS_SERVICE', { error: (error as Error).message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to fetch expired subscriptions');
    }
  }

  public static async bulkExpireSubscriptions(subscriptionIds: string[]): Promise<number> {
    if (subscriptionIds.length === 0) {
      return 0;
    }

    try {
      const data = await db
        .update(appSubscriptions)
        .set({ status: 'expired' })
        .where(inArray(appSubscriptions.id, subscriptionIds))
        .returning({ id: appSubscriptions.id });

      return data.length;
    } catch (error) {
      Logger.error('Failed to bulk expire subscriptions', 'SUBSCRIPTIONS_SERVICE', { error: (error as Error).message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to expire subscriptions');
    }
  }

  private static mapToSub(row: typeof appSubscriptions.$inferSelect): ISubscription {
    return {
      id: row.id,
      profile_id: row.profile_id,
      package_id: row.package_id,
      start_date: row.start_date,
      end_date: row.end_date,
      status: row.status as ISubscription['status'],
      paystack_subscription_code: row.paystack_subscription_code,
      paystack_customer_code: row.paystack_customer_code,
      paystack_email_token: row.paystack_email_token,
      paystack_transaction_reference: row.paystack_transaction_reference,
      current_period_end: row.current_period_end?.toISOString() ?? null,
      refunded_at: row.refunded_at?.toISOString() ?? null,
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString(),
    };
  }

  private static mapToSubWithPkg(row: JoinedSubscriptionRow): ISubscriptionWithPackage {
    const pkg = row.app_packages;
    const perm = row.app_permissions;
    return {
      ...SubscriptionsService.mapToSub(row.app_subscriptions),
      app_packages: {
        id: pkg.id,
        package_name: pkg.package_name,
        slug: pkg.slug,
        type: pkg.type as ISubscriptionWithPackage['app_packages']['type'],
        permission_id: pkg.permission_id,
        description: pkg.description,
        is_active: pkg.is_active,
        paystack_plan_code: pkg.paystack_plan_code,
        created_at: pkg.created_at.toISOString(),
        updated_at: pkg.updated_at.toISOString(),
        app_permissions: {
          id: perm.id,
          permission_name: perm.permission_name,
          psira_access: perm.psira_access,
          firearm_access: perm.firearm_access,
          vehicle_access: perm.vehicle_access,
          certificate_access: perm.certificate_access,
          drivers_access: perm.drivers_access,
          created_at: perm.created_at.toISOString(),
          updated_at: perm.updated_at.toISOString(),
        },
      },
    };
  }
}
