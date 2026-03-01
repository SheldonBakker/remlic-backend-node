import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../../shared/types/request';
import { ResponseUtil } from '../../shared/utils/response';
import { HTTP_STATUS } from '../../shared/constants/httpStatus';
import { requireUser } from '../../shared/utils/authHelpers';
import {
  getDriverLicencesByUserId,
  getDriverLicenceById,
  createDriverLicence,
  updateDriverLicence,
  deleteDriverLicence,
} from '../../infrastructure/database/driver_licences/driverLicenceMethods';
import { DriverLicenceValidation } from '../../infrastructure/database/driver_licences/validation';
import { PaginationUtil } from '../../shared/utils/pagination';

export const list = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: userId } = requireUser(req);
    if (typeof req.query.id === 'string') {
      const licenceId = DriverLicenceValidation.validateDriverLicenceId(req.query.id);
      const driver_licence = await getDriverLicenceById(licenceId, userId);
      ResponseUtil.success(res, { driver_licence }, HTTP_STATUS.OK);
      return;
    }
    const params = PaginationUtil.parseQuery(req.query);
    const filters = DriverLicenceValidation.validateFilters(req.query);
    const { items, pagination } = await getDriverLicencesByUserId(userId, params, filters);
    ResponseUtil.success(res, { driver_licences: items }, HTTP_STATUS.OK, pagination);
  } catch (error) {
    next(error);
  }
};

export const create = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: userId } = requireUser(req);
    const validatedData = DriverLicenceValidation.validateCreateDriverLicence(req.body);
    const driver_licence = await createDriverLicence({ ...validatedData, profile_id: userId });
    ResponseUtil.success(res, { driver_licence }, HTTP_STATUS.CREATED);
  } catch (error) {
    next(error);
  }
};

export const update = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: userId } = requireUser(req);
    const licenceId = DriverLicenceValidation.validateDriverLicenceId(req.params.id);
    const validatedData = DriverLicenceValidation.validateUpdateDriverLicence(req.body);
    const driver_licence = await updateDriverLicence({ ...validatedData, id: licenceId, profile_id: userId });
    ResponseUtil.success(res, { driver_licence }, HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};

export const remove = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: userId } = requireUser(req);
    const licenceId = DriverLicenceValidation.validateDriverLicenceId(req.params.id);
    await deleteDriverLicence(licenceId, userId);
    ResponseUtil.success(res, { message: 'Driver licence deleted successfully' }, HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};
