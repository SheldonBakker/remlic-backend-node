import type { IDashboardExpiringRecord, IDashboardFilters } from './types.js';
import db from '../drizzleClient.js';
import { sql } from 'drizzle-orm';
import { HttpError } from '../../../shared/types/errors/appError.js';
import { HTTP_STATUS } from '../../../shared/constants/httpStatus.js';
import { Logger } from '../../../shared/utils/logging/logger.js';
import { PaginationUtil, type ICursorParams, type IPaginatedResult } from '../../../shared/utils/pagination.js';

export default class DashboardService {
  public static async getUpcomingExpiries(
    userId: string,
    params: ICursorParams,
    filters: IDashboardFilters,
  ): Promise<IPaginatedResult<IDashboardExpiringRecord>> {
    try {
      const cursor = PaginationUtil.decodeCursor(params.cursor);

      const today = new Date().toISOString().split('T')[0] ?? '';
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + filters.days_ahead);
      const futureDateStr = futureDate.toISOString().split('T')[0] ?? '';

      const conditions = [sql`profile_id = ${userId}`];

      if (!filters.include_expired) {
        conditions.push(sql`expiry_date >= ${today}`);
      }
      conditions.push(sql`expiry_date <= ${futureDateStr}`);

      if (filters.record_type) {
        conditions.push(sql`record_type = ${filters.record_type}`);
      }

      if (cursor) {
        conditions.push(
          sql`(created_at < ${cursor.created_at} OR (created_at = ${cursor.created_at} AND id < ${cursor.id}))`,
        );
      }

      const whereClause = sql.join(conditions, sql.raw(' AND '));
      const orderDir = filters.sort_order === 'desc' ? sql.raw('DESC') : sql.raw('ASC');
      const limitVal = params.limit + 1;

      const query = sql`SELECT * FROM dashboard_expiring_records WHERE ${whereClause} ORDER BY expiry_date ${orderDir}, created_at DESC, id DESC LIMIT ${limitVal}`;

      const records = (await db.execute(query)) as unknown as IDashboardExpiringRecord[];
      const hasMore = records.length > params.limit;
      const items = hasMore ? records.slice(0, params.limit) : [...records];
      const pagination = PaginationUtil.buildPagination(items, params.limit);

      return { items, pagination };
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      Logger.error('Failed to fetch dashboard expiring records', 'DASHBOARD_SERVICE', {
        error: (error as Error).message,
      });
      throw new HttpError(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'Failed to fetch dashboard data',
      );
    }
  }
}
