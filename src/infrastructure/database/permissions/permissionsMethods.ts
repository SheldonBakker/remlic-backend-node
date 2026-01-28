import type { IPermission, ICreatePermissionRequest, IUpdatePermissionRequest } from './types.js';
import { supabaseAdmin } from '../supabaseClient.js';
import { HttpError } from '../../../shared/types/errors/appError.js';
import { HTTP_STATUS } from '../../../shared/constants/httpStatus.js';
import { Logger } from '../../../shared/utils/logger.js';
import { PaginationUtil, type ICursorParams, type IPaginatedResult } from '../../../shared/utils/pagination.js';
import { buildPartialUpdate } from '../../../shared/utils/updateBuilder.js';

export default class PermissionsService {
  public static async getPermissions(
    params: ICursorParams,
  ): Promise<IPaginatedResult<IPermission>> {
    const cursor = PaginationUtil.decodeCursor(params.cursor);

    let query = supabaseAdmin
      .from('app_permissions')
      .select('*')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(params.limit);

    if (cursor) {
      query = query.or(`created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`);
    }

    const { data, error } = await query;

    if (error) {
      Logger.error('Failed to fetch permissions', 'PERMISSIONS_SERVICE', { error: error.message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to fetch permissions');
    }

    const items = data as IPermission[];
    const pagination = PaginationUtil.buildPagination(items, params.limit);

    return { items, pagination };
  }

  public static async getPermissionById(permissionId: string): Promise<IPermission> {
    const { data, error } = await supabaseAdmin
      .from('app_permissions')
      .select('*')
      .eq('id', permissionId)
      .single();

    if (error || !data) {
      Logger.warn('Permission not found', 'PERMISSIONS_SERVICE', { permissionId });
      throw new HttpError(HTTP_STATUS.NOT_FOUND, 'Permission not found');
    }

    return data as IPermission;
  }

  public static async createPermission(data: ICreatePermissionRequest): Promise<IPermission> {
    const { data: permission, error } = await supabaseAdmin
      .from('app_permissions')
      .insert({
        permission_name: data.permission_name,
        psira_access: data.psira_access ?? false,
        firearm_access: data.firearm_access ?? false,
        vehicle_access: data.vehicle_access ?? false,
        certificate_access: data.certificate_access ?? false,
        drivers_access: data.drivers_access ?? false,
      })
      .select()
      .single();

    if (error) {
      Logger.error('Failed to create permission', 'PERMISSIONS_SERVICE', { error: error.message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to create permission');
    }

    return permission as IPermission;
  }

  public static async updatePermission(
    permissionId: string,
    data: IUpdatePermissionRequest,
  ): Promise<IPermission> {
    const { error: findError } = await supabaseAdmin
      .from('app_permissions')
      .select('id')
      .eq('id', permissionId)
      .single();

    if (findError) {
      Logger.warn('Permission not found for update', 'PERMISSIONS_SERVICE', { permissionId });
      throw new HttpError(HTTP_STATUS.NOT_FOUND, 'Permission not found');
    }

    const updateData = buildPartialUpdate(data, ['permission_name', 'psira_access', 'firearm_access', 'vehicle_access', 'certificate_access', 'drivers_access']);

    const { data: permission, error: updateError } = await supabaseAdmin
      .from('app_permissions')
      .update(updateData)
      .eq('id', permissionId)
      .select()
      .single();

    if (updateError) {
      Logger.error('Failed to update permission', 'PERMISSIONS_SERVICE', { error: updateError.message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to update permission');
    }

    return permission as IPermission;
  }

  public static async deletePermission(permissionId: string): Promise<void> {
    const { error: findError } = await supabaseAdmin
      .from('app_permissions')
      .select('id')
      .eq('id', permissionId)
      .single();

    if (findError) {
      Logger.warn('Permission not found for deletion', 'PERMISSIONS_SERVICE', { permissionId });
      throw new HttpError(HTTP_STATUS.NOT_FOUND, 'Permission not found');
    }

    const { error: deleteError } = await supabaseAdmin
      .from('app_permissions')
      .delete()
      .eq('id', permissionId);

    if (deleteError) {
      if (deleteError.code === '23503') {
        Logger.warn('Cannot delete permission with linked packages', 'PERMISSIONS_SERVICE', { permissionId });
        throw new HttpError(HTTP_STATUS.CONFLICT, 'Cannot delete permission that is linked to packages');
      }
      Logger.error('Failed to delete permission', 'PERMISSIONS_SERVICE', { error: deleteError.message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to delete permission');
    }
  }
}
