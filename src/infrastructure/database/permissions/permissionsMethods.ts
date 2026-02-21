import type { IPermission, ICreatePermissionRequest, IUpdatePermissionRequest } from './types';
import db from '../databaseClient';
import { appPermissions } from '../schema/index';
import { eq, or, lt, and, desc } from 'drizzle-orm';
import { HttpError } from '../../../shared/types/errors/appError';
import { HTTP_STATUS } from '../../../shared/constants/httpStatus';
import Logger from '../../../shared/utils/logger';
import { PaginationUtil, type ICursorParams, type IPaginatedResult } from '../../../shared/utils/pagination';
import { buildPartialUpdate } from '../../../shared/utils/updateBuilder';

export default class PermissionsService {
  private static readonly CONTEXT = 'PERMISSIONS_SERVICE';

  public static async getPermissions(
    params: ICursorParams,
  ): Promise<IPaginatedResult<IPermission>> {
    try {
      const cursor = PaginationUtil.decodeCursor(params.cursor);

      const conditions = [];
      if (cursor) {
        conditions.push(
          or(
            lt(appPermissions.created_at, new Date(cursor.created_at)),
            and(eq(appPermissions.created_at, new Date(cursor.created_at)), lt(appPermissions.id, cursor.id)),
          ),
        );
      }

      const data = await db
        .select()
        .from(appPermissions)
        .where(conditions.length > 0 ? conditions[0] : undefined)
        .orderBy(desc(appPermissions.created_at), desc(appPermissions.id))
        .limit(params.limit);

      const items = data.map((row) => PermissionsService.mapToPermission(row));
      const pagination = PaginationUtil.buildPagination(items, params.limit);

      return { items, pagination };
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      Logger.error(this.CONTEXT, 'Failed to fetch permissions', error);
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to fetch permissions');
    }
  }

  public static async getPermissionById(permissionId: string): Promise<IPermission> {
    try {
      const [data] = await db
        .select()
        .from(appPermissions)
        .where(eq(appPermissions.id, permissionId));

      if (!data) {
        Logger.warn(this.CONTEXT, `Permission not found (permissionId: ${permissionId})`);
        throw new HttpError(HTTP_STATUS.NOT_FOUND, 'Permission not found');
      }

      return PermissionsService.mapToPermission(data);
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      Logger.error(this.CONTEXT, 'Failed to fetch permission', error);
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to fetch permission');
    }
  }

  public static async createPermission(data: ICreatePermissionRequest): Promise<IPermission> {
    try {
      const [permission] = await db
        .insert(appPermissions)
        .values({
          permission_name: data.permission_name,
          psira_access: data.psira_access ?? false,
          firearm_access: data.firearm_access ?? false,
          vehicle_access: data.vehicle_access ?? false,
          certificate_access: data.certificate_access ?? false,
          drivers_access: data.drivers_access ?? false,
        })
        .returning();

      if (!permission) {
        throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to create permission');
      }

      return PermissionsService.mapToPermission(permission);
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      Logger.error(this.CONTEXT, 'Failed to create permission', error);
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to create permission');
    }
  }

  public static async updatePermission(
    permissionId: string,
    data: IUpdatePermissionRequest,
  ): Promise<IPermission> {
    try {
      const [existing] = await db
        .select({ id: appPermissions.id })
        .from(appPermissions)
        .where(eq(appPermissions.id, permissionId));

      if (!existing) {
        Logger.warn(this.CONTEXT, `Permission not found for update (permissionId: ${permissionId})`);
        throw new HttpError(HTTP_STATUS.NOT_FOUND, 'Permission not found');
      }

      const updateData = buildPartialUpdate(data, ['permission_name', 'psira_access', 'firearm_access', 'vehicle_access', 'certificate_access', 'drivers_access']);

      const [permission] = await db
        .update(appPermissions)
        .set(updateData)
        .where(eq(appPermissions.id, permissionId))
        .returning();

      if (!permission) {
        throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to update permission');
      }

      return PermissionsService.mapToPermission(permission);
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      Logger.error(this.CONTEXT, 'Failed to update permission', error);
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to update permission');
    }
  }

  public static async deletePermission(permissionId: string): Promise<void> {
    try {
      const [existing] = await db
        .select({ id: appPermissions.id })
        .from(appPermissions)
        .where(eq(appPermissions.id, permissionId));

      if (!existing) {
        Logger.warn(this.CONTEXT, `Permission not found for deletion (permissionId: ${permissionId})`);
        throw new HttpError(HTTP_STATUS.NOT_FOUND, 'Permission not found');
      }

      await db
        .delete(appPermissions)
        .where(eq(appPermissions.id, permissionId));
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      const cause = (error as Record<string, unknown>).cause as Record<string, unknown> | undefined;
      if (cause?.code === '23503' || (error as Record<string, unknown>).code === '23503') {
        Logger.warn(this.CONTEXT, `Cannot delete permission with linked packages (permissionId: ${permissionId})`);
        throw new HttpError(HTTP_STATUS.CONFLICT, 'Cannot delete permission that is linked to packages');
      }
      Logger.error(this.CONTEXT, 'Failed to delete permission', error);
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to delete permission');
    }
  }

  private static mapToPermission(row: typeof appPermissions.$inferSelect): IPermission {
    return {
      id: row.id,
      permission_name: row.permission_name,
      psira_access: row.psira_access,
      firearm_access: row.firearm_access,
      vehicle_access: row.vehicle_access,
      certificate_access: row.certificate_access,
      drivers_access: row.drivers_access,
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString(),
    };
  }
}
