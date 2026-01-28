import type { IFirearm, ICreateFirearmData, IUpdateFirearmData, IFirearmsFilters } from './types.js';
import { supabaseAdmin } from '../supabaseClient.js';
import { HttpError } from '../../../shared/types/errors/appError.js';
import { HTTP_STATUS } from '../../../shared/constants/httpStatus.js';
import { Logger } from '../../../shared/utils/logger.js';
import { PaginationUtil, type ICursorParams, type IPaginatedResult } from '../../../shared/utils/pagination.js';
import { buildPartialUpdate } from '../../../shared/utils/updateBuilder.js';

export default class FirearmsService {
  public static async getFirearmsByUserId(
    userId: string,
    params: ICursorParams,
    filters: IFirearmsFilters = {},
  ): Promise<IPaginatedResult<IFirearm>> {
    const cursor = PaginationUtil.decodeCursor(params.cursor);

    let query = supabaseAdmin
      .from('firearms')
      .select('*')
      .eq('profile_id', userId);

    if (filters.serial_number) {
      query = query.ilike('serial_number', filters.serial_number);
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
      Logger.error('Failed to fetch firearms', 'FIREARMS_SERVICE', { error: error.message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to fetch firearms');
    }

    const items = data as IFirearm[];
    const pagination = PaginationUtil.buildPagination(items, params.limit);

    return { items, pagination };
  }

  public static async getFirearmById(firearmId: string, userId: string): Promise<IFirearm> {
    const { data, error } = await supabaseAdmin
      .from('firearms')
      .select('*')
      .eq('id', firearmId)
      .eq('profile_id', userId)
      .single();

    if (error || !data) {
      Logger.warn('Firearm not found', 'FIREARMS_SERVICE', { firearmId, userId });
      throw new HttpError(HTTP_STATUS.NOT_FOUND, 'Firearm not found');
    }

    return data as IFirearm;
  }

  public static async createFirearm(data: ICreateFirearmData): Promise<IFirearm> {
    const { data: firearm, error } = await supabaseAdmin
      .from('firearms')
      .insert({
        profile_id: data.profile_id,
        type: data.type,
        make: data.make,
        model: data.model,
        caliber: data.caliber,
        serial_number: data.serial_number,
        expiry_date: data.expiry_date,
      })
      .select()
      .single();

    if (error) {
      Logger.error('Failed to create firearm', 'FIREARMS_SERVICE', { error: error.message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to create firearm');
    }

    return firearm as IFirearm;
  }

  public static async updateFirearm(data: IUpdateFirearmData): Promise<IFirearm> {
    const { error: findError } = await supabaseAdmin
      .from('firearms')
      .select('id')
      .eq('id', data.id)
      .eq('profile_id', data.profile_id)
      .single();

    if (findError) {
      Logger.warn('Firearm not found for update', 'FIREARMS_SERVICE', { firearmId: data.id, userId: data.profile_id });
      throw new HttpError(HTTP_STATUS.NOT_FOUND, 'Firearm not found');
    }

    const updateData = buildPartialUpdate(data, ['type', 'make', 'model', 'caliber', 'serial_number', 'expiry_date']);

    const { data: firearm, error: updateError } = await supabaseAdmin
      .from('firearms')
      .update(updateData)
      .eq('id', data.id)
      .eq('profile_id', data.profile_id)
      .select()
      .single();

    if (updateError) {
      Logger.error('Failed to update firearm', 'FIREARMS_SERVICE', { error: updateError.message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to update firearm');
    }

    return firearm as IFirearm;
  }

  public static async deleteFirearm(firearmId: string, userId: string): Promise<void> {
    const { error: findError } = await supabaseAdmin
      .from('firearms')
      .select('id')
      .eq('id', firearmId)
      .eq('profile_id', userId)
      .single();

    if (findError) {
      Logger.warn('Firearm not found for deletion', 'FIREARMS_SERVICE', { firearmId, userId });
      throw new HttpError(HTTP_STATUS.NOT_FOUND, 'Firearm not found');
    }

    const { error: deleteError } = await supabaseAdmin
      .from('firearms')
      .delete()
      .eq('id', firearmId)
      .eq('profile_id', userId);

    if (deleteError) {
      Logger.error('Failed to delete firearm', 'FIREARMS_SERVICE', { error: deleteError.message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to delete firearm');
    }
  }
}
