import type { IDriverLicence, ICreateDriverLicenceData, IUpdateDriverLicenceData, IDriverLicenceFilters } from './types.js';
import { supabaseAdmin } from '../supabaseClient.js';
import { HttpError } from '../../../shared/types/errors/appError.js';
import { HTTP_STATUS } from '../../../shared/constants/httpStatus.js';
import { Logger } from '../../../shared/utils/logger.js';
import { PaginationUtil, type ICursorParams, type IPaginatedResult } from '../../../shared/utils/pagination.js';
import { buildPartialUpdate } from '../../../shared/utils/updateBuilder.js';

export default class DriverLicenceService {
  public static async getDriverLicencesByUserId(
    userId: string,
    params: ICursorParams,
    filters: IDriverLicenceFilters = {},
  ): Promise<IPaginatedResult<IDriverLicence>> {
    const cursor = PaginationUtil.decodeCursor(params.cursor);

    let query = supabaseAdmin
      .from('driver_licences')
      .select('*')
      .eq('profile_id', userId);

    if (filters.surname !== undefined) {
      query = query.ilike('surname', `%${filters.surname}%`);
    }

    if (filters.id_number !== undefined) {
      query = query.eq('id_number', filters.id_number);
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
      Logger.error('Failed to fetch driver licences', 'DRIVER_LICENCE_SERVICE', { error: error.message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to fetch driver licences');
    }

    const items = data as IDriverLicence[];
    const pagination = PaginationUtil.buildPagination(items, params.limit);

    return { items, pagination };
  }

  public static async getDriverLicenceById(licenceId: string, userId: string): Promise<IDriverLicence> {
    const { data, error } = await supabaseAdmin
      .from('driver_licences')
      .select('*')
      .eq('id', licenceId)
      .eq('profile_id', userId)
      .single();

    if (error || !data) {
      Logger.warn('Driver licence not found', 'DRIVER_LICENCE_SERVICE', { licenceId, userId });
      throw new HttpError(HTTP_STATUS.NOT_FOUND, 'Driver licence not found');
    }

    return data as IDriverLicence;
  }

  public static async createDriverLicence(data: ICreateDriverLicenceData): Promise<IDriverLicence> {
    const { data: licence, error } = await supabaseAdmin
      .from('driver_licences')
      .insert({
        profile_id: data.profile_id,
        surname: data.surname,
        initials: data.initials,
        id_number: data.id_number,
        expiry_date: data.expiry_date,
      })
      .select()
      .single();

    if (error) {
      Logger.error('Failed to create driver licence', 'DRIVER_LICENCE_SERVICE', { error: error.message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to create driver licence');
    }

    return licence as IDriverLicence;
  }

  public static async updateDriverLicence(data: IUpdateDriverLicenceData): Promise<IDriverLicence> {
    const { error: findError } = await supabaseAdmin
      .from('driver_licences')
      .select('id')
      .eq('id', data.id)
      .eq('profile_id', data.profile_id)
      .single();

    if (findError) {
      Logger.warn('Driver licence not found for update', 'DRIVER_LICENCE_SERVICE', { licenceId: data.id, userId: data.profile_id });
      throw new HttpError(HTTP_STATUS.NOT_FOUND, 'Driver licence not found');
    }

    const updateData = buildPartialUpdate(data, ['surname', 'initials', 'id_number', 'expiry_date']);

    const { data: licence, error: updateError } = await supabaseAdmin
      .from('driver_licences')
      .update(updateData)
      .eq('id', data.id)
      .eq('profile_id', data.profile_id)
      .select()
      .single();

    if (updateError) {
      Logger.error('Failed to update driver licence', 'DRIVER_LICENCE_SERVICE', { error: updateError.message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to update driver licence');
    }

    return licence as IDriverLicence;
  }

  public static async deleteDriverLicence(licenceId: string, userId: string): Promise<void> {
    const { error: findError } = await supabaseAdmin
      .from('driver_licences')
      .select('id')
      .eq('id', licenceId)
      .eq('profile_id', userId)
      .single();

    if (findError) {
      Logger.warn('Driver licence not found for deletion', 'DRIVER_LICENCE_SERVICE', { licenceId, userId });
      throw new HttpError(HTTP_STATUS.NOT_FOUND, 'Driver licence not found');
    }

    const { error: deleteError } = await supabaseAdmin
      .from('driver_licences')
      .delete()
      .eq('id', licenceId)
      .eq('profile_id', userId);

    if (deleteError) {
      Logger.error('Failed to delete driver licence', 'DRIVER_LICENCE_SERVICE', { error: deleteError.message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to delete driver licence');
    }
  }
}
