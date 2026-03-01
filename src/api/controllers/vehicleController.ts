import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../../shared/types/request';
import { ResponseUtil } from '../../shared/utils/response';
import { HTTP_STATUS } from '../../shared/constants/httpStatus';
import { requireUser } from '../../shared/utils/authHelpers';
import {
  getVehiclesByUserId,
  getVehicleById,
  createVehicle,
  updateVehicle,
  deleteVehicle,
} from '../../infrastructure/database/vehicle/vehicleMethods';
import { VehicleValidation } from '../../infrastructure/database/vehicle/validation';
import { PaginationUtil } from '../../shared/utils/pagination';

export const list = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: userId } = requireUser(req);
    if (typeof req.query.id === 'string') {
      const vehicleId = VehicleValidation.validateVehicleId(req.query.id);
      const vehicle = await getVehicleById(vehicleId, userId);
      ResponseUtil.success(res, { vehicle }, HTTP_STATUS.OK);
      return;
    }
    const params = PaginationUtil.parseQuery(req.query);
    const filters = VehicleValidation.validateFilters(req.query);
    const { items, pagination } = await getVehiclesByUserId(userId, params, filters);
    ResponseUtil.success(res, { vehicles: items }, HTTP_STATUS.OK, pagination);
  } catch (error) {
    next(error);
  }
};

export const create = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: userId } = requireUser(req);
    const validatedData = VehicleValidation.validateCreateVehicle(req.body);
    const vehicle = await createVehicle({ ...validatedData, profile_id: userId });
    ResponseUtil.success(res, { vehicle }, HTTP_STATUS.CREATED);
  } catch (error) {
    next(error);
  }
};

export const update = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: userId } = requireUser(req);
    const vehicleId = VehicleValidation.validateVehicleId(req.params.id);
    const validatedData = VehicleValidation.validateUpdateVehicle(req.body);
    const vehicle = await updateVehicle({ ...validatedData, id: vehicleId, profile_id: userId });
    ResponseUtil.success(res, { vehicle }, HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};

export const remove = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: userId } = requireUser(req);
    const vehicleId = VehicleValidation.validateVehicleId(req.params.id);
    await deleteVehicle(vehicleId, userId);
    ResponseUtil.success(res, { message: 'Vehicle deleted successfully' }, HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};
