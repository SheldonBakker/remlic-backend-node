import type { IPackage, IPackageWithPermission, ICreatePackageRequest, IUpdatePackageRequest, IPackagesFilters } from './types.js';
import { supabaseAdmin } from '../supabaseClient.js';
import { HttpError } from '../../../shared/types/errors/appError.js';
import { HTTP_STATUS } from '../../../shared/constants/httpStatus.js';
import { Logger } from '../../../shared/utils/logger.js';
import { PaginationUtil, type ICursorParams, type IPaginatedResult } from '../../../shared/utils/pagination.js';
import { buildPartialUpdate } from '../../../shared/utils/updateBuilder.js';

export default class PackagesService {
  public static async getPackages(
    params: ICursorParams,
    filters: IPackagesFilters = {},
  ): Promise<IPaginatedResult<IPackageWithPermission>> {
    const cursor = PaginationUtil.decodeCursor(params.cursor);

    let query = supabaseAdmin
      .from('app_packages')
      .select('*, app_permissions(*)');

    if (filters.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }

    if (filters.type) {
      query = query.eq('type', filters.type);
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
      Logger.error('Failed to fetch packages', 'PACKAGES_SERVICE', { error: error.message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to fetch packages');
    }

    const items = data as IPackageWithPermission[];
    const pagination = PaginationUtil.buildPagination(items, params.limit);

    return { items, pagination };
  }

  public static async getPackageById(packageId: string): Promise<IPackageWithPermission> {
    const { data, error } = await supabaseAdmin
      .from('app_packages')
      .select('*, app_permissions(*)')
      .eq('id', packageId)
      .single();

    if (error || !data) {
      Logger.warn('Package not found', 'PACKAGES_SERVICE', { packageId });
      throw new HttpError(HTTP_STATUS.NOT_FOUND, 'Package not found');
    }

    return data as IPackageWithPermission;
  }

  public static async getPackageBySlug(slug: string): Promise<IPackageWithPermission> {
    const { data, error } = await supabaseAdmin
      .from('app_packages')
      .select('*, app_permissions(*)')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      Logger.warn('Package not found by slug', 'PACKAGES_SERVICE', { slug });
      throw new HttpError(HTTP_STATUS.NOT_FOUND, 'Package not found');
    }

    return data as IPackageWithPermission;
  }

  public static async getByPaystackPlanCode(planCode: string): Promise<IPackageWithPermission> {
    const { data, error } = await supabaseAdmin
      .from('app_packages')
      .select('*, app_permissions(*)')
      .eq('paystack_plan_code', planCode)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      Logger.warn('Package not found by Paystack plan code', 'PACKAGES_SERVICE', { planCode });
      throw new HttpError(HTTP_STATUS.NOT_FOUND, 'Package not found');
    }

    return data as IPackageWithPermission;
  }

  public static async createPackage(data: ICreatePackageRequest): Promise<IPackage> {
    // Verify permission exists
    const { error: permissionError } = await supabaseAdmin
      .from('app_permissions')
      .select('id')
      .eq('id', data.permission_id)
      .single();

    if (permissionError) {
      Logger.warn('Permission not found for package creation', 'PACKAGES_SERVICE', { permission_id: data.permission_id });
      throw new HttpError(HTTP_STATUS.BAD_REQUEST, 'Invalid permission ID');
    }

    const { data: pkg, error } = await supabaseAdmin
      .from('app_packages')
      .insert({
        package_name: data.package_name,
        slug: data.slug,
        type: data.type,
        permission_id: data.permission_id,
        description: data.description ?? null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        Logger.warn('Package slug already exists', 'PACKAGES_SERVICE', { slug: data.slug });
        throw new HttpError(HTTP_STATUS.CONFLICT, 'Package with this slug already exists');
      }
      Logger.error('Failed to create package', 'PACKAGES_SERVICE', { error: error.message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to create package');
    }

    return pkg as IPackage;
  }

  private static async validatePackageExists(packageId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('app_packages')
      .select('id')
      .eq('id', packageId)
      .single();

    if (error) {
      Logger.warn('Package not found for update', 'PACKAGES_SERVICE', { packageId });
      throw new HttpError(HTTP_STATUS.NOT_FOUND, 'Package not found');
    }
  }

  private static async validatePermissionExists(permissionId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('app_permissions')
      .select('id')
      .eq('id', permissionId)
      .single();

    if (error) {
      Logger.warn('Permission not found for package update', 'PACKAGES_SERVICE', { permission_id: permissionId });
      throw new HttpError(HTTP_STATUS.BAD_REQUEST, 'Invalid permission ID');
    }
  }

  public static async updatePackage(
    packageId: string,
    data: IUpdatePackageRequest,
  ): Promise<IPackage> {
    await this.validatePackageExists(packageId);

    if (data.permission_id) {
      await this.validatePermissionExists(data.permission_id);
    }

    const updateData = buildPartialUpdate(data, ['package_name', 'slug', 'type', 'permission_id', 'description', 'is_active']);

    const { data: pkg, error: updateError } = await supabaseAdmin
      .from('app_packages')
      .update(updateData)
      .eq('id', packageId)
      .select()
      .single();

    if (updateError) {
      if (updateError.code === '23505') {
        Logger.warn('Package slug already exists', 'PACKAGES_SERVICE', { slug: data.slug });
        throw new HttpError(HTTP_STATUS.CONFLICT, 'Package with this slug already exists');
      }
      Logger.error('Failed to update package', 'PACKAGES_SERVICE', { error: updateError.message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to update package');
    }

    return pkg as IPackage;
  }

  public static async deletePackage(packageId: string): Promise<void> {
    const { error: findError } = await supabaseAdmin
      .from('app_packages')
      .select('id')
      .eq('id', packageId)
      .single();

    if (findError) {
      Logger.warn('Package not found for deletion', 'PACKAGES_SERVICE', { packageId });
      throw new HttpError(HTTP_STATUS.NOT_FOUND, 'Package not found');
    }

    // Soft delete by setting is_active to false
    const { error: updateError } = await supabaseAdmin
      .from('app_packages')
      .update({ is_active: false })
      .eq('id', packageId);

    if (updateError) {
      Logger.error('Failed to deactivate package', 'PACKAGES_SERVICE', { error: updateError.message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to deactivate package');
    }
  }
}
