import type { IDashboardExpiringRecord, IDashboardFilters } from './types.js';
import { supabaseAdmin } from '../supabaseClient.js';
import { HttpError } from '../../../shared/types/errors/appError.js';
import { HTTP_STATUS } from '../../../shared/constants/httpStatus.js';
import { Logger } from '../../../shared/utils/logger.js';
import { PaginationUtil, type ICursorParams, type IPaginatedResult } from '../../../shared/utils/pagination.js';

export default class DashboardService {
  public static async getUpcomingExpiries(
    userId: string,
    params: ICursorParams,
    filters: IDashboardFilters,
  ): Promise<IPaginatedResult<IDashboardExpiringRecord>> {
    const cursor = PaginationUtil.decodeCursor(params.cursor);

    const today = new Date().toISOString().split('T')[0];
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + filters.days_ahead);
    const futureDateStr = futureDate.toISOString().split('T')[0];

    let query = supabaseAdmin
      .from('dashboard_expiring_records')
      .select('*')
      .eq('profile_id', userId);

    if (!filters.include_expired) {
      query = query.gte('expiry_date', today);
    }
    query = query.lte('expiry_date', futureDateStr);

    if (filters.record_type) {
      query = query.eq('record_type', filters.record_type);
    }

    const ascending = filters.sort_order !== 'desc';
    query = query
      .order('expiry_date', { ascending })
      .order('created_at', { ascending: false })
      .order('id', { ascending: false });

    if (cursor) {
      query = query.or(
        `created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`,
      );
    }

    query = query.limit(params.limit + 1);

    const { data, error } = await query;

    if (error) {
      Logger.error('Failed to fetch dashboard expiring records', 'DASHBOARD_SERVICE', {
        error: error.message,
      });
      throw new HttpError(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'Failed to fetch dashboard data',
      );
    }

    const records = (data as IDashboardExpiringRecord[] | null) ?? [];
    const hasMore = records.length > params.limit;
    const items = hasMore ? records.slice(0, params.limit) : records;
    const pagination = PaginationUtil.buildPagination(items, params.limit);

    return { items, pagination };
  }
}
