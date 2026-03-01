import type {
  ISubscription,
  ISubscriptionWithPackage,
  ICreateSubscriptionRequest,
  IUpdateSubscriptionRequest,
  ISubscriptionsFilters,
  IUserPermissions,
  ICreateSubscriptionFromPaystack,
} from './types';
import db from '../databaseClient';
import { appSubscriptions, appPackages, appPermissions, profiles } from '../schema/index';
import { eq, or, lt, and, desc, lte, gte, inArray, type SQL } from 'drizzle-orm';
import { HttpError } from '../../../shared/types/errors/appError';
import { HTTP_STATUS } from '../../../shared/constants/httpStatus';
import Logger from '../../../shared/utils/logger';
import { PaginationUtil, type ICursorParams, type IPaginatedResult } from '../../../shared/utils/pagination';
import { buildPartialUpdate } from '../../../shared/utils/updateBuilder';

const CONTEXT = 'SUBSCRIPTIONS_SERVICE';

interface JoinedSubscriptionRow {
  app_subscriptions: typeof appSubscriptions.$inferSelect;
  app_packages: typeof appPackages.$inferSelect;
  app_permissions: typeof appPermissions.$inferSelect;
}

export async function getSubscriptions(
  params: ICursorParams,
  filters: ISubscriptionsFilters = {},
): Promise<IPaginatedResult<ISubscriptionWithPackage>> {
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

  const items = results.map((row) => mapToSubWithPkg(row));
  const pagination = PaginationUtil.buildPagination(items, params.limit);

  return { items, pagination };
}

export async function getSubscriptionById(subscriptionId: string): Promise<ISubscriptionWithPackage> {
  const result = await db
    .select()
    .from(appSubscriptions)
    .innerJoin(appPackages, eq(appSubscriptions.package_id, appPackages.id))
    .innerJoin(appPermissions, eq(appPackages.permission_id, appPermissions.id))
    .where(eq(appSubscriptions.id, subscriptionId))
    .limit(1)
    .then((rows) => rows.at(0));

  if (!result) {
    Logger.warn(CONTEXT, `Subscription not found (subscriptionId: ${subscriptionId})`);
    throw new HttpError(HTTP_STATUS.NOT_FOUND, 'Subscription not found');
  }

  return mapToSubWithPkg(result);
}

export async function getUserSubscriptions(
  userId: string,
  params: ICursorParams,
): Promise<IPaginatedResult<ISubscriptionWithPackage>> {
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

  const items = results.map((row) => mapToSubWithPkg(row));
  const pagination = PaginationUtil.buildPagination(items, params.limit);

  return { items, pagination };
}

export async function getUserPermissions(userId: string): Promise<IUserPermissions> {
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

  const subscriptions = results.map((row) => mapToSubWithPkg(row));

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

export async function createSubscription(data: ICreateSubscriptionRequest): Promise<ISubscription> {
  const profileExists = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.id, data.profile_id))
    .then((rows) => rows.at(0));

  if (!profileExists) {
    Logger.warn(CONTEXT, `Profile not found for subscription creation (profile_id: ${data.profile_id})`);
    throw new HttpError(HTTP_STATUS.BAD_REQUEST, 'Invalid profile ID');
  }

  const packageExists = await db
    .select({ id: appPackages.id })
    .from(appPackages)
    .where(and(eq(appPackages.id, data.package_id), eq(appPackages.is_active, true)))
    .then((rows) => rows.at(0));

  if (!packageExists) {
    Logger.warn(CONTEXT, `Package not found or inactive for subscription creation (package_id: ${data.package_id})`);
    throw new HttpError(HTTP_STATUS.BAD_REQUEST, 'Invalid or inactive package ID');
  }

  const subscription = await db
    .insert(appSubscriptions)
    .values({
      profile_id: data.profile_id,
      package_id: data.package_id,
      start_date: data.start_date,
      end_date: data.end_date,
      status: 'active',
    })
    .returning()
    .then((rows) => rows.at(0));

  if (!subscription) {
    throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to create subscription');
  }

  return mapToSub(subscription);
}

async function getExistingSubscription(subscriptionId: string): Promise<ISubscription> {
  const data = await db
    .select()
    .from(appSubscriptions)
    .where(eq(appSubscriptions.id, subscriptionId))
    .then((rows) => rows.at(0));

  if (!data) {
    Logger.warn(CONTEXT, `Subscription not found for update (subscriptionId: ${subscriptionId})`);
    throw new HttpError(HTTP_STATUS.NOT_FOUND, 'Subscription not found');
  }

  return mapToSub(data);
}

async function validateActivePackage(packageId: string): Promise<void> {
  const existing = await db
    .select({ id: appPackages.id })
    .from(appPackages)
    .where(and(eq(appPackages.id, packageId), eq(appPackages.is_active, true)))
    .then((rows) => rows.at(0));

  if (!existing) {
    Logger.warn(CONTEXT, `Package not found for subscription update (package_id: ${packageId})`);
    throw new HttpError(HTTP_STATUS.BAD_REQUEST, 'Invalid or inactive package ID');
  }
}

export async function updateSubscription(
  subscriptionId: string,
  data: IUpdateSubscriptionRequest,
): Promise<ISubscription> {
  const existing = await getExistingSubscription(subscriptionId);

  if (data.package_id) {
    await validateActivePackage(data.package_id);
  }

  const startDate = data.start_date ?? existing.start_date;
  const endDate = data.end_date ?? existing.end_date;
  if (new Date(endDate) < new Date(startDate)) {
    throw new HttpError(HTTP_STATUS.BAD_REQUEST, 'End date must be on or after start date');
  }

  const updateData = buildPartialUpdate(data, ['package_id', 'start_date', 'end_date', 'status']);

  const subscription = await db
    .update(appSubscriptions)
    .set(updateData)
    .where(eq(appSubscriptions.id, subscriptionId))
    .returning()
    .then((rows) => rows.at(0));

  if (!subscription) {
    throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to update subscription');
  }

  return mapToSub(subscription);
}

export async function cancelSubscription(subscriptionId: string): Promise<void> {
  const existing = await db
    .select({ id: appSubscriptions.id })
    .from(appSubscriptions)
    .where(eq(appSubscriptions.id, subscriptionId))
    .then((rows) => rows.at(0));

  if (!existing) {
    Logger.warn(CONTEXT, `Subscription not found for cancellation (subscriptionId: ${subscriptionId})`);
    throw new HttpError(HTTP_STATUS.NOT_FOUND, 'Subscription not found');
  }

  await db
    .update(appSubscriptions)
    .set({ status: 'cancelled' })
    .where(eq(appSubscriptions.id, subscriptionId));
}

export async function getByPaystackCode(subscriptionCode: string): Promise<ISubscriptionWithPackage | null> {
  const result = await db
    .select()
    .from(appSubscriptions)
    .innerJoin(appPackages, eq(appSubscriptions.package_id, appPackages.id))
    .innerJoin(appPermissions, eq(appPackages.permission_id, appPermissions.id))
    .where(eq(appSubscriptions.paystack_subscription_code, subscriptionCode))
    .limit(1)
    .then((rows) => rows.at(0));

  if (!result) {
    return null;
  }

  return mapToSubWithPkg(result);
}

export async function createFromPaystack(data: ICreateSubscriptionFromPaystack): Promise<ISubscription> {
  const startDate = new Date();
  const endDate = new Date(data.current_period_end);

  const subscription = await db
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
    .returning()
    .then((rows) => rows.at(0));

  if (!subscription) {
    throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to create subscription');
  }

  return mapToSub(subscription);
}

export async function renewSubscription(
  subscriptionCode: string,
  newPeriodEnd: string,
): Promise<ISubscription> {
  const existing = await getByPaystackCode(subscriptionCode);
  if (!existing) {
    throw new HttpError(HTTP_STATUS.NOT_FOUND, 'Subscription not found');
  }

  const endDate = new Date(newPeriodEnd);

  const subscription = await db
    .update(appSubscriptions)
    .set({
      end_date: endDate.toISOString().split('T')[0] ?? '',
      current_period_end: new Date(newPeriodEnd),
      status: 'active',
    })
    .where(eq(appSubscriptions.paystack_subscription_code, subscriptionCode))
    .returning()
    .then((rows) => rows.at(0));

  if (!subscription) {
    throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to renew subscription');
  }

  return mapToSub(subscription);
}

export async function markCancelledByPaystack(subscriptionCode: string): Promise<void> {
  await db
    .update(appSubscriptions)
    .set({ status: 'cancelled' })
    .where(eq(appSubscriptions.paystack_subscription_code, subscriptionCode));
}

export async function markRefunded(subscriptionId: string): Promise<ISubscription> {
  const subscription = await db
    .update(appSubscriptions)
    .set({
      status: 'refunded',
      refunded_at: new Date(),
    })
    .where(eq(appSubscriptions.id, subscriptionId))
    .returning()
    .then((rows) => rows.at(0));

  if (!subscription) {
    throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to process refund');
  }

  return mapToSub(subscription);
}

export async function getUserActiveSubscription(userId: string): Promise<ISubscriptionWithPackage | null> {
  const today = new Date().toISOString().split('T')[0] ?? '';

  const result = await db
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
    .limit(1)
    .then((rows) => rows.at(0));

  if (!result) {
    return null;
  }

  return mapToSubWithPkg(result);
}

export async function getProfileIdsWithValidSubscription(profileIds: string[]): Promise<Set<string>> {
  if (profileIds.length === 0) {
    return new Set();
  }

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
}

export async function getExpiredActiveSubscriptions(): Promise<Pick<ISubscription, 'id'>[]> {
  const today = new Date().toISOString().split('T')[0] ?? '';

  const data = await db
    .select({ id: appSubscriptions.id })
    .from(appSubscriptions)
    .where(and(eq(appSubscriptions.status, 'active'), lt(appSubscriptions.end_date, today)));

  return data;
}

export async function bulkExpireSubscriptions(subscriptionIds: string[]): Promise<number> {
  if (subscriptionIds.length === 0) {
    return 0;
  }

  const data = await db
    .update(appSubscriptions)
    .set({ status: 'expired' })
    .where(inArray(appSubscriptions.id, subscriptionIds))
    .returning({ id: appSubscriptions.id });

  return data.length;
}

function mapToSub(row: typeof appSubscriptions.$inferSelect): ISubscription {
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

function mapToSubWithPkg(row: JoinedSubscriptionRow): ISubscriptionWithPackage {
  const pkg = row.app_packages;
  const perm = row.app_permissions;
  return {
    ...mapToSub(row.app_subscriptions),
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
