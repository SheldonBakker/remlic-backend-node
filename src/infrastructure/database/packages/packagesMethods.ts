import type { IPackage, IPackageWithPermission, ICreatePackageRequest, IUpdatePackageRequest, IPackagesFilters } from './types';
import db from '../databaseClient';
import { appPackages, appPermissions } from '../schema/index';
import { eq, or, lt, and, desc, type SQL } from 'drizzle-orm';
import { HttpError } from '../../../shared/types/errors/appError';
import { HTTP_STATUS } from '../../../shared/constants/httpStatus';
import Logger from '../../../shared/utils/logger';
import { PaginationUtil, type ICursorParams, type IPaginatedResult } from '../../../shared/utils/pagination';
import { buildPartialUpdate } from '../../../shared/utils/updateBuilder';

const CONTEXT = 'PACKAGES_SERVICE';

export async function getPackages(
  params: ICursorParams,
  filters: IPackagesFilters = {},
): Promise<IPaginatedResult<IPackageWithPermission>> {
  const cursor = PaginationUtil.decodeCursor(params.cursor);

  const conditions: SQL[] = [];

  if (filters.is_active !== undefined) {
    conditions.push(eq(appPackages.is_active, filters.is_active));
  }

  if (filters.type) {
    conditions.push(eq(appPackages.type, filters.type));
  }

  if (cursor) {
    const cursorCondition = or(
      lt(appPackages.created_at, new Date(cursor.created_at)),
      and(eq(appPackages.created_at, new Date(cursor.created_at)), lt(appPackages.id, cursor.id)),
    );
    if (cursorCondition) {
      conditions.push(cursorCondition);
    }
  }

  const results = await db.query.appPackages.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    with: { appPermissions: true },
    orderBy: [desc(appPackages.created_at), desc(appPackages.id)],
    limit: params.limit,
  });

  const items = results.map((row) => mapToPackageWithPermission(row));
  const pagination = PaginationUtil.buildPagination(items, params.limit);

  return { items, pagination };
}

export async function getPackageById(packageId: string): Promise<IPackageWithPermission> {
  const result = await db.query.appPackages.findFirst({
    where: eq(appPackages.id, packageId),
    with: { appPermissions: true },
  });

  if (!result) {
    Logger.warn(CONTEXT, `Package not found (packageId: ${packageId})`);
    throw new HttpError(HTTP_STATUS.NOT_FOUND, 'Package not found');
  }

  return mapToPackageWithPermission(result);
}

export async function getPackageBySlug(slug: string): Promise<IPackageWithPermission> {
  const result = await db.query.appPackages.findFirst({
    where: and(eq(appPackages.slug, slug), eq(appPackages.is_active, true)),
    with: { appPermissions: true },
  });

  if (!result) {
    Logger.warn(CONTEXT, `Package not found by slug (slug: ${slug})`);
    throw new HttpError(HTTP_STATUS.NOT_FOUND, 'Package not found');
  }

  return mapToPackageWithPermission(result);
}

export async function getByPaystackPlanCode(planCode: string): Promise<IPackageWithPermission> {
  const result = await db.query.appPackages.findFirst({
    where: and(eq(appPackages.paystack_plan_code, planCode), eq(appPackages.is_active, true)),
    with: { appPermissions: true },
  });

  if (!result) {
    Logger.warn(CONTEXT, `Package not found by Paystack plan code (planCode: ${planCode})`);
    throw new HttpError(HTTP_STATUS.NOT_FOUND, 'Package not found');
  }

  return mapToPackageWithPermission(result);
}

export async function createPackage(data: ICreatePackageRequest): Promise<IPackage> {
  const permExists = await db
    .select({ id: appPermissions.id })
    .from(appPermissions)
    .where(eq(appPermissions.id, data.permission_id))
    .then((rows) => rows.at(0));

  if (!permExists) {
    Logger.warn(CONTEXT, `Permission not found for package creation (permission_id: ${data.permission_id})`);
    throw new HttpError(HTTP_STATUS.BAD_REQUEST, 'Invalid permission ID');
  }

  try {
    const pkg = await db
      .insert(appPackages)
      .values({
        package_name: data.package_name,
        slug: data.slug,
        type: data.type,
        permission_id: data.permission_id,
        description: data.description ?? null,
      })
      .returning()
      .then((rows) => rows.at(0));

    if (!pkg) {
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to create package');
    }

    return mapToPackage(pkg);
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
    const cause = (error as Record<string, unknown>).cause as Record<string, unknown> | undefined;
    if (cause?.code === '23505' || (error as Record<string, unknown>).code === '23505') {
      Logger.warn(CONTEXT, `Package slug already exists (slug: ${data.slug})`);
      throw new HttpError(HTTP_STATUS.CONFLICT, 'Package with this slug already exists');
    }
    throw error;
  }
}

async function validatePackageExists(packageId: string): Promise<void> {
  const existing = await db
    .select({ id: appPackages.id })
    .from(appPackages)
    .where(eq(appPackages.id, packageId))
    .then((rows) => rows.at(0));

  if (!existing) {
    Logger.warn(CONTEXT, `Package not found for update (packageId: ${packageId})`);
    throw new HttpError(HTTP_STATUS.NOT_FOUND, 'Package not found');
  }
}

async function validatePermissionExists(permissionId: string): Promise<void> {
  const existing = await db
    .select({ id: appPermissions.id })
    .from(appPermissions)
    .where(eq(appPermissions.id, permissionId))
    .then((rows) => rows.at(0));

  if (!existing) {
    Logger.warn(CONTEXT, `Permission not found for package update (permission_id: ${permissionId})`);
    throw new HttpError(HTTP_STATUS.BAD_REQUEST, 'Invalid permission ID');
  }
}

export async function updatePackage(
  packageId: string,
  data: IUpdatePackageRequest,
): Promise<IPackage> {
  await validatePackageExists(packageId);

  if (data.permission_id) {
    await validatePermissionExists(data.permission_id);
  }

  const updateData = buildPartialUpdate(data, ['package_name', 'slug', 'type', 'permission_id', 'description', 'is_active']);

  try {
    const pkg = await db
      .update(appPackages)
      .set(updateData)
      .where(eq(appPackages.id, packageId))
      .returning()
      .then((rows) => rows.at(0));

    if (!pkg) {
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to update package');
    }

    return mapToPackage(pkg);
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
    const cause = (error as Record<string, unknown>).cause as Record<string, unknown> | undefined;
    if (cause?.code === '23505' || (error as Record<string, unknown>).code === '23505') {
      Logger.warn(CONTEXT, `Package slug already exists (slug: ${data.slug})`);
      throw new HttpError(HTTP_STATUS.CONFLICT, 'Package with this slug already exists');
    }
    throw error;
  }
}

export async function deletePackage(packageId: string): Promise<void> {
  const existing = await db
    .select({ id: appPackages.id })
    .from(appPackages)
    .where(eq(appPackages.id, packageId))
    .then((rows) => rows.at(0));

  if (!existing) {
    Logger.warn(CONTEXT, `Package not found for deletion (packageId: ${packageId})`);
    throw new HttpError(HTTP_STATUS.NOT_FOUND, 'Package not found');
  }

  await db
    .update(appPackages)
    .set({ is_active: false })
    .where(eq(appPackages.id, packageId));
}

function mapToPackage(row: typeof appPackages.$inferSelect): IPackage {
  return {
    id: row.id,
    package_name: row.package_name,
    slug: row.slug,
    type: row.type as IPackage['type'],
    permission_id: row.permission_id,
    description: row.description,
    is_active: row.is_active,
    paystack_plan_code: row.paystack_plan_code,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

function mapToPackageWithPermission(
  row: typeof appPackages.$inferSelect & { appPermissions: typeof appPermissions.$inferSelect },
): IPackageWithPermission {
  return {
    ...mapToPackage(row),
    app_permissions: {
      id: row.appPermissions.id,
      permission_name: row.appPermissions.permission_name,
      psira_access: row.appPermissions.psira_access,
      firearm_access: row.appPermissions.firearm_access,
      vehicle_access: row.appPermissions.vehicle_access,
      certificate_access: row.appPermissions.certificate_access,
      drivers_access: row.appPermissions.drivers_access,
      created_at: row.appPermissions.created_at.toISOString(),
      updated_at: row.appPermissions.updated_at.toISOString(),
    },
  };
}
