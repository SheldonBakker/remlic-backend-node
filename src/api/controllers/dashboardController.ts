import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../../shared/types/request.js';
import { ResponseUtil } from '../../shared/utils/response.js';
import { HTTP_STATUS } from '../../shared/constants/httpStatus.js';
import { HttpError } from '../../shared/types/errors/appError.js';
import DashboardService from '../../infrastructure/database/dashboard/dashboardMethods.js';
import { DashboardValidation } from '../../infrastructure/database/dashboard/validation.js';
import { PaginationUtil } from '../../shared/utils/pagination.js';

export default class DashboardController {
  public static getUpcomingExpiries = async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      throw new HttpError(HTTP_STATUS.UNAUTHORIZED, 'User not authenticated');
    }

    const params = PaginationUtil.parseQuery(req.query);
    const filters = DashboardValidation.validateFilters(req.query);
    const { items, pagination } = await DashboardService.getUpcomingExpiries(userId, params, filters);
    ResponseUtil.success(res, { expiring_records: items }, HTTP_STATUS.OK, pagination);
  };
}
