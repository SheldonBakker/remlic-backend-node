import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../../shared/types/request.js';
import { ResponseUtil } from '../../shared/utils/response.js';
import { HTTP_STATUS } from '../../shared/constants/httpStatus.js';
import { HttpError } from '../../shared/types/errors/appError.js';
import DriverLicenceService from '../../infrastructure/database/driver_licences/driverLicenceMethods.js';
import { DriverLicenceValidation } from '../../infrastructure/database/driver_licences/validation.js';
import { PaginationUtil } from '../../shared/utils/pagination.js';

export default class DriverLicenceController {
  public static getDriverLicences = async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      throw new HttpError(HTTP_STATUS.UNAUTHORIZED, 'User not authenticated');
    }

    const params = PaginationUtil.parseQuery(req.query);
    const filters = DriverLicenceValidation.validateFilters(req.query);
    const { items, pagination } = await DriverLicenceService.getDriverLicencesByUserId(userId, params, filters);
    ResponseUtil.success(res, { driver_licences: items }, HTTP_STATUS.OK, pagination);
  };

  public static getDriverLicenceById = async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      throw new HttpError(HTTP_STATUS.UNAUTHORIZED, 'User not authenticated');
    }

    const licenceId = DriverLicenceValidation.validateDriverLicenceId(req.params.id);
    const licence = await DriverLicenceService.getDriverLicenceById(licenceId, userId);
    ResponseUtil.success(res, { driver_licence: licence }, HTTP_STATUS.OK);
  };

  public static createDriverLicence = async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      throw new HttpError(HTTP_STATUS.UNAUTHORIZED, 'User not authenticated');
    }

    const validatedData = DriverLicenceValidation.validateCreateDriverLicence(req.body);
    const licence = await DriverLicenceService.createDriverLicence({
      ...validatedData,
      profile_id: userId,
    });
    ResponseUtil.success(res, { driver_licence: licence }, HTTP_STATUS.CREATED);
  };

  public static updateDriverLicence = async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      throw new HttpError(HTTP_STATUS.UNAUTHORIZED, 'User not authenticated');
    }

    const licenceId = DriverLicenceValidation.validateDriverLicenceId(req.params.id);
    const validatedData = DriverLicenceValidation.validateUpdateDriverLicence(req.body);
    const licence = await DriverLicenceService.updateDriverLicence({
      ...validatedData,
      id: licenceId,
      profile_id: userId,
    });
    ResponseUtil.success(res, { driver_licence: licence }, HTTP_STATUS.OK);
  };

  public static deleteDriverLicence = async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      throw new HttpError(HTTP_STATUS.UNAUTHORIZED, 'User not authenticated');
    }

    const licenceId = DriverLicenceValidation.validateDriverLicenceId(req.params.id);
    await DriverLicenceService.deleteDriverLicence(licenceId, userId);
    ResponseUtil.success(res, { message: 'Driver licence deleted successfully' }, HTTP_STATUS.OK);
  };

}
