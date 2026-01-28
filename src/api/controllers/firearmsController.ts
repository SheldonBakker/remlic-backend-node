import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../../shared/types/request.js';
import { ResponseUtil } from '../../shared/utils/response.js';
import { HTTP_STATUS } from '../../shared/constants/httpStatus.js';
import { HttpError } from '../../shared/types/errors/appError.js';
import FirearmsService from '../../infrastructure/database/firearms/firearmsMethods.js';
import { FirearmsValidation } from '../../infrastructure/database/firearms/validation.js';
import { PaginationUtil } from '../../shared/utils/pagination.js';

export default class FirearmsController {
  public static getFirearms = async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      throw new HttpError(HTTP_STATUS.UNAUTHORIZED, 'User not authenticated');
    }

    const params = PaginationUtil.parseQuery(req.query);
    const filters = FirearmsValidation.validateFilters(req.query);
    const { items, pagination } = await FirearmsService.getFirearmsByUserId(userId, params, filters);
    ResponseUtil.success(res, { firearms: items }, HTTP_STATUS.OK, pagination);
  };

  public static getFirearmById = async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      throw new HttpError(HTTP_STATUS.UNAUTHORIZED, 'User not authenticated');
    }

    const firearmId = FirearmsValidation.validateFirearmId(req.params.id);
    const firearm = await FirearmsService.getFirearmById(firearmId, userId);
    ResponseUtil.success(res, { firearm }, HTTP_STATUS.OK);
  };

  public static createFirearm = async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      throw new HttpError(HTTP_STATUS.UNAUTHORIZED, 'User not authenticated');
    }

    const validatedData = FirearmsValidation.validateCreateFirearm(req.body);
    const firearm = await FirearmsService.createFirearm({
      ...validatedData,
      profile_id: userId,
    });
    ResponseUtil.success(res, { firearm }, HTTP_STATUS.CREATED);
  };

  public static updateFirearm = async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      throw new HttpError(HTTP_STATUS.UNAUTHORIZED, 'User not authenticated');
    }

    const firearmId = FirearmsValidation.validateFirearmId(req.params.id);
    const validatedData = FirearmsValidation.validateUpdateFirearm(req.body);
    const firearm = await FirearmsService.updateFirearm({
      ...validatedData,
      id: firearmId,
      profile_id: userId,
    });
    ResponseUtil.success(res, { firearm }, HTTP_STATUS.OK);
  };

  public static deleteFirearm = async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      throw new HttpError(HTTP_STATUS.UNAUTHORIZED, 'User not authenticated');
    }

    const firearmId = FirearmsValidation.validateFirearmId(req.params.id);
    await FirearmsService.deleteFirearm(firearmId, userId);
    ResponseUtil.success(res, { message: 'Firearm deleted successfully' }, HTTP_STATUS.OK);
  };
}
