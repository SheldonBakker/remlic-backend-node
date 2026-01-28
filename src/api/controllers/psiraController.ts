import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../../shared/types/request.js';
import { ResponseUtil } from '../../shared/utils/response.js';
import { HTTP_STATUS } from '../../shared/constants/httpStatus.js';
import { HttpError } from '../../shared/types/errors/appError.js';
import PsiraService from '../../infrastructure/database/psira/psiraMethods.js';
import { PsiraValidation } from '../../infrastructure/database/psira/validation.js';
import { PaginationUtil } from '../../shared/utils/pagination.js';

export default class PsiraController {
  public static getApplicantDetails = async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      throw new HttpError(HTTP_STATUS.UNAUTHORIZED, 'User not authenticated');
    }

    const idNumber = PsiraValidation.validateIdNumber(req.params.idNumber);
    const officers = await PsiraService.getApplicantDetails(idNumber);
    ResponseUtil.success(res, { officers }, HTTP_STATUS.OK);
  };

  public static getOfficers = async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      throw new HttpError(HTTP_STATUS.UNAUTHORIZED, 'User not authenticated');
    }

    const params = PaginationUtil.parseQuery(req.query);
    const filters = PsiraValidation.validateFilters(req.query);
    const { items, pagination } = await PsiraService.getOfficersByUserId(userId, params, filters);
    ResponseUtil.success(res, { officers: items }, HTTP_STATUS.OK, pagination);
  };

  public static createOfficer = async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      throw new HttpError(HTTP_STATUS.UNAUTHORIZED, 'User not authenticated');
    }

    const validatedData = PsiraValidation.validateCreateOfficer(req.body);
    const officer = await PsiraService.createOfficer(validatedData, userId);
    ResponseUtil.success(res, { officer }, HTTP_STATUS.CREATED);
  };

  public static deleteOfficer = async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      throw new HttpError(HTTP_STATUS.UNAUTHORIZED, 'User not authenticated');
    }

    const officerId = PsiraValidation.validateOfficerId(req.params.id);
    await PsiraService.deleteOfficer(officerId, userId);
    ResponseUtil.success(res, { message: 'Officer deleted successfully' }, HTTP_STATUS.OK);
  };
}
