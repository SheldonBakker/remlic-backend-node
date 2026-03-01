import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../../shared/types/request';
import { ResponseUtil } from '../../shared/utils/response';
import { HTTP_STATUS } from '../../shared/constants/httpStatus';
import { requireUser } from '../../shared/utils/authHelpers';
import { getUpcomingExpiries } from '../../infrastructure/database/dashboard/dashboardMethods';
import { DashboardValidation } from '../../infrastructure/database/dashboard/validation';
import { PaginationUtil } from '../../shared/utils/pagination';

export const listExpiring = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: userId } = requireUser(req);
    const params = PaginationUtil.parseQuery(req.query);
    const filters = DashboardValidation.validateFilters(req.query);
    const { items, pagination } = await getUpcomingExpiries(userId, params, filters);
    ResponseUtil.success(res, { expiring_records: items }, HTTP_STATUS.OK, pagination);
  } catch (error) {
    next(error);
  }
};
