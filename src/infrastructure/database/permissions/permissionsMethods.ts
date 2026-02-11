import type { IPermission, ICreatePermissionRequest, IUpdatePermissionRequest } from './types.js';
import db from '../drizzleClient.js';
import { appPermissions } from '../schema/index.js';
import { eq, or, lt, and, desc } from 'drizzle-orm';
import { HttpError } from '../../../shared/types/errors/appError.js';
import { HTTP_STATUS } from '../../../shared/constants/httpStatus.js';
import { Logger } from '../../../shared/utils/logging/logger.js';
import { PaginationUtil, type ICursorParams, type IPaginatedResult } from '../../../shared/utils/pagination.js';
import { buildPartialUpdate } from '../../../shared/utils/updateBuilder.js';

export default class PermissionsService {
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
      Logger.error('Failed to fetch permissions', 'PERMISSIONS_SERVICE', { error: (error as Error).message });
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
        Logger.warn('Permission not found', 'PERMISSIONS_SERVICE', { permissionId });
        throw new HttpError(HTTP_STATUS.NOT_FOUND, 'Permission not found');
      }

      return PermissionsService.mapToPermission(data);
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      Logger.error('Failed to fetch permission', 'PERMISSIONS_SERVICE', { error: (error as Error).message });
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
      Logger.error('Failed to create permission', 'PERMISSIONS_SERVICE', { error: (error as Error).message });
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
        Logger.warn('Permission not found for update', 'PERMISSIONS_SERVICE', { permissionId });
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
      Logger.error('Failed to update permission', 'PERMISSIONS_SERVICE', { error: (error as Error).message });
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
        Logger.warn('Permission not found for deletion', 'PERMISSIONS_SERVICE', { permissionId });
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
        Logger.warn('Cannot delete permission with linked packages', 'PERMISSIONS_SERVICE', { permissionId });
        throw new HttpError(HTTP_STATUS.CONFLICT, 'Cannot delete permission that is linked to packages');
      }
      Logger.error('Failed to delete permission', 'PERMISSIONS_SERVICE', { error: (error as Error).message });
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
