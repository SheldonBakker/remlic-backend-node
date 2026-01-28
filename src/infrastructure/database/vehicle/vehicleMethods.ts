import type { IVehicle, ICreateVehicleData, IUpdateVehicleData, IVehicleFilters } from './types.js';
import { supabaseAdmin } from '../supabaseClient.js';
import { HttpError } from '../../../shared/types/errors/appError.js';
import { HTTP_STATUS } from '../../../shared/constants/httpStatus.js';
import { Logger } from '../../../shared/utils/logger.js';
import { PaginationUtil, type ICursorParams, type IPaginatedResult } from '../../../shared/utils/pagination.js';
import { buildPartialUpdate } from '../../../shared/utils/updateBuilder.js';

export default class VehicleService {
  public static async getVehiclesByUserId(
    userId: string,
    params: ICursorParams,
    filters: IVehicleFilters = {},
  ): Promise<IPaginatedResult<IVehicle>> {
    const cursor = PaginationUtil.decodeCursor(params.cursor);

    let query = supabaseAdmin
      .from('vehicles')
      .select('*')
      .eq('profile_id', userId);

    if (filters.year !== undefined) {
      query = query.eq('year', filters.year);
    }

    if (filters.registration_number !== undefined) {
      const { data: matchingVehicles, error: rpcError } = await supabaseAdmin
        .rpc('search_vehicles_by_registration', {
          p_user_id: userId,
          p_registration_number: filters.registration_number,
        });

      if (rpcError) {
        Logger.error('Failed to search vehicles by registration', 'VEHICLE_SERVICE', { error: rpcError.message });
        throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to fetch vehicles');
      }

      const matchingIds = (matchingVehicles as IVehicle[]).map((v) => v.id);
      if (matchingIds.length === 0) {
        return { items: [], pagination: { nextCursor: null } };
      }
      query = query.in('id', matchingIds);
    }

    if (filters.sort_by) {
      const ascending = filters.sort_order === 'asc';
      query = query.order(filters.sort_by, { ascending });
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
      Logger.error('Failed to fetch vehicles', 'VEHICLE_SERVICE', { error: error.message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to fetch vehicles');
    }

    const items = data as IVehicle[];
    const pagination = PaginationUtil.buildPagination(items, params.limit);

    return { items, pagination };
  }

  public static async getVehicleById(vehicleId: string, userId: string): Promise<IVehicle> {
    const { data, error } = await supabaseAdmin
      .from('vehicles')
      .select('*')
      .eq('id', vehicleId)
      .eq('profile_id', userId)
      .single();

    if (error || !data) {
      Logger.warn('Vehicle not found', 'VEHICLE_SERVICE', { vehicleId, userId });
      throw new HttpError(HTTP_STATUS.NOT_FOUND, 'Vehicle not found');
    }

    return data as IVehicle;
  }

  public static async createVehicle(data: ICreateVehicleData): Promise<IVehicle> {
    const { data: vehicle, error } = await supabaseAdmin
      .from('vehicles')
      .insert({
        profile_id: data.profile_id,
        make: data.make,
        model: data.model,
        year: data.year,
        vin_number: data.vin_number ?? null,
        registration_number: data.registration_number,
        expiry_date: data.expiry_date,
      })
      .select()
      .single();

    if (error) {
      Logger.error('Failed to create vehicle', 'VEHICLE_SERVICE', { error: error.message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to create vehicle');
    }

    return vehicle as IVehicle;
  }

  public static async updateVehicle(data: IUpdateVehicleData): Promise<IVehicle> {
    const { error: findError } = await supabaseAdmin
      .from('vehicles')
      .select('id')
      .eq('id', data.id)
      .eq('profile_id', data.profile_id)
      .single();

    if (findError) {
      Logger.warn('Vehicle not found for update', 'VEHICLE_SERVICE', { vehicleId: data.id, userId: data.profile_id });
      throw new HttpError(HTTP_STATUS.NOT_FOUND, 'Vehicle not found');
    }

    const updateData = buildPartialUpdate(data, ['make', 'model', 'year', 'vin_number', 'registration_number', 'expiry_date']);

    const { data: vehicle, error: updateError } = await supabaseAdmin
      .from('vehicles')
      .update(updateData)
      .eq('id', data.id)
      .eq('profile_id', data.profile_id)
      .select()
      .single();

    if (updateError) {
      Logger.error('Failed to update vehicle', 'VEHICLE_SERVICE', { error: updateError.message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to update vehicle');
    }

    return vehicle as IVehicle;
  }

  public static async deleteVehicle(vehicleId: string, userId: string): Promise<void> {
    const { error: findError } = await supabaseAdmin
      .from('vehicles')
      .select('id')
      .eq('id', vehicleId)
      .eq('profile_id', userId)
      .single();

    if (findError) {
      Logger.warn('Vehicle not found for deletion', 'VEHICLE_SERVICE', { vehicleId, userId });
      throw new HttpError(HTTP_STATUS.NOT_FOUND, 'Vehicle not found');
    }

    const { error: deleteError } = await supabaseAdmin
      .from('vehicles')
      .delete()
      .eq('id', vehicleId)
      .eq('profile_id', userId);

    if (deleteError) {
      Logger.error('Failed to delete vehicle', 'VEHICLE_SERVICE', { error: deleteError.message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to delete vehicle');
    }
  }
}
