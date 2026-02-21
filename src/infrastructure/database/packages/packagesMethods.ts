import type { IPackage, IPackageWithPermission, ICreatePackageRequest, IUpdatePackageRequest, IPackagesFilters } from './types';
import db from '../databaseClient';
import { appPackages, appPermissions } from '../schema/index';
import { eq, or, lt, and, desc, type SQL } from 'drizzle-orm';
import { HttpError } from '../../../shared/types/errors/appError';
import { HTTP_STATUS } from '../../../shared/constants/httpStatus';
import Logger from '../../../shared/utils/logger';
import { PaginationUtil, type ICursorParams, type IPaginatedResult } from '../../../shared/utils/pagination';
import { buildPartialUpdate } from '../../../shared/utils/updateBuilder';

export default class PackagesService {
  private static readonly CONTEXT = 'PACKAGES_SERVICE';

  public static async getPackages(
    params: ICursorParams,
    filters: IPackagesFilters = {},
  ): Promise<IPaginatedResult<IPackageWithPermission>> {
    try {
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

      const items = results.map((row) => PackagesService.mapToPackageWithPermission(row));
      const pagination = PaginationUtil.buildPagination(items, params.limit);

      return { items, pagination };
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      Logger.error(this.CONTEXT, 'Failed to fetch packages', error);
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to fetch packages');
    }
  }

  public static async getPackageById(packageId: string): Promise<IPackageWithPermission> {
    try {
      const result = await db.query.appPackages.findFirst({
        where: eq(appPackages.id, packageId),
        with: { appPermissions: true },
      });

      if (!result) {
        Logger.warn(this.CONTEXT, `Package not found (packageId: ${packageId})`);
        throw new HttpError(HTTP_STATUS.NOT_FOUND, 'Package not found');
      }

      return PackagesService.mapToPackageWithPermission(result);
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      Logger.error(this.CONTEXT, 'Failed to fetch package', error);
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to fetch package');
    }
  }

  public static async getPackageBySlug(slug: string): Promise<IPackageWithPermission> {
    try {
      const result = await db.query.appPackages.findFirst({
        where: and(eq(appPackages.slug, slug), eq(appPackages.is_active, true)),
        with: { appPermissions: true },
      });

      if (!result) {
        Logger.warn(this.CONTEXT, `Package not found by slug (slug: ${slug})`);
        throw new HttpError(HTTP_STATUS.NOT_FOUND, 'Package not found');
      }

      return PackagesService.mapToPackageWithPermission(result);
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      Logger.error(this.CONTEXT, 'Failed to fetch package by slug', error);
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to fetch package');
    }
  }

  public static async getByPaystackPlanCode(planCode: string): Promise<IPackageWithPermission> {
    try {
      const result = await db.query.appPackages.findFirst({
        where: and(eq(appPackages.paystack_plan_code, planCode), eq(appPackages.is_active, true)),
        with: { appPermissions: true },
      });

      if (!result) {
        Logger.warn(this.CONTEXT, `Package not found by Paystack plan code (planCode: ${planCode})`);
        throw new HttpError(HTTP_STATUS.NOT_FOUND, 'Package not found');
      }

      return PackagesService.mapToPackageWithPermission(result);
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      Logger.error(this.CONTEXT, 'Failed to fetch package by plan code', error);
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to fetch package');
    }
  }

  public static async createPackage(data: ICreatePackageRequest): Promise<IPackage> {
    try {
      const [permExists] = await db
        .select({ id: appPermissions.id })
        .from(appPermissions)
        .where(eq(appPermissions.id, data.permission_id));

      if (!permExists) {
        Logger.warn(this.CONTEXT, `Permission not found for package creation (permission_id: ${data.permission_id})`);
        throw new HttpError(HTTP_STATUS.BAD_REQUEST, 'Invalid permission ID');
      }

      const [pkg] = await db
        .insert(appPackages)
        .values({
          package_name: data.package_name,
          slug: data.slug,
          type: data.type,
          permission_id: data.permission_id,
          description: data.description ?? null,
        })
        .returning();

      if (!pkg) {
        throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to create package');
      }

      return PackagesService.mapToPackage(pkg);
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      const cause = (error as Record<string, unknown>).cause as Record<string, unknown> | undefined;
      if (cause?.code === '23505' || (error as Record<string, unknown>).code === '23505') {
        Logger.warn(this.CONTEXT, `Package slug already exists (slug: ${data.slug})`);
        throw new HttpError(HTTP_STATUS.CONFLICT, 'Package with this slug already exists');
      }
      Logger.error(this.CONTEXT, 'Failed to create package', error);
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to create package');
    }
  }

  private static async validatePackageExists(packageId: string): Promise<void> {
    const [existing] = await db
      .select({ id: appPackages.id })
      .from(appPackages)
      .where(eq(appPackages.id, packageId));

    if (!existing) {
      Logger.warn(this.CONTEXT, `Package not found for update (packageId: ${packageId})`);
      throw new HttpError(HTTP_STATUS.NOT_FOUND, 'Package not found');
    }
  }

  private static async validatePermissionExists(permissionId: string): Promise<void> {
    const [existing] = await db
      .select({ id: appPermissions.id })
      .from(appPermissions)
      .where(eq(appPermissions.id, permissionId));

    if (!existing) {
      Logger.warn(this.CONTEXT, `Permission not found for package update (permission_id: ${permissionId})`);
      throw new HttpError(HTTP_STATUS.BAD_REQUEST, 'Invalid permission ID');
    }
  }

  public static async updatePackage(
    packageId: string,
    data: IUpdatePackageRequest,
  ): Promise<IPackage> {
    try {
      await this.validatePackageExists(packageId);

      if (data.permission_id) {
        await this.validatePermissionExists(data.permission_id);
      }

      const updateData = buildPartialUpdate(data, ['package_name', 'slug', 'type', 'permission_id', 'description', 'is_active']);

      const [pkg] = await db
        .update(appPackages)
        .set(updateData)
        .where(eq(appPackages.id, packageId))
        .returning();

      if (!pkg) {
        throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to update package');
      }

      return PackagesService.mapToPackage(pkg);
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      const cause = (error as Record<string, unknown>).cause as Record<string, unknown> | undefined;
      if (cause?.code === '23505' || (error as Record<string, unknown>).code === '23505') {
        Logger.warn(this.CONTEXT, `Package slug already exists (slug: ${data.slug})`);
        throw new HttpError(HTTP_STATUS.CONFLICT, 'Package with this slug already exists');
      }
      Logger.error(this.CONTEXT, 'Failed to update package', error);
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to update package');
    }
  }

  public static async deletePackage(packageId: string): Promise<void> {
    try {
      const [existing] = await db
        .select({ id: appPackages.id })
        .from(appPackages)
        .where(eq(appPackages.id, packageId));

      if (!existing) {
        Logger.warn(this.CONTEXT, `Package not found for deletion (packageId: ${packageId})`);
        throw new HttpError(HTTP_STATUS.NOT_FOUND, 'Package not found');
      }

      await db
        .update(appPackages)
        .set({ is_active: false })
        .where(eq(appPackages.id, packageId));
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      Logger.error(this.CONTEXT, 'Failed to deactivate package', error);
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to deactivate package');
    }
  }

  private static mapToPackage(row: typeof appPackages.$inferSelect): IPackage {
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

  private static mapToPackageWithPermission(
    row: typeof appPackages.$inferSelect & { appPermissions: typeof appPermissions.$inferSelect },
  ): IPackageWithPermission {
    return {
      ...PackagesService.mapToPackage(row),
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
}
