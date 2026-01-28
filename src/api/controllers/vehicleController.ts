import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../../shared/types/request.js';
import { ResponseUtil } from '../../shared/utils/response.js';
import { HTTP_STATUS } from '../../shared/constants/httpStatus.js';
import { HttpError } from '../../shared/types/errors/appError.js';
import VehicleService from '../../infrastructure/database/vehicle/vehicleMethods.js';
import { VehicleValidation } from '../../infrastructure/database/vehicle/validation.js';
import { PaginationUtil } from '../../shared/utils/pagination.js';

export default class VehicleController {
  public static getVehicles = async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      throw new HttpError(HTTP_STATUS.UNAUTHORIZED, 'User not authenticated');
    }

    const params = PaginationUtil.parseQuery(req.query);
    const filters = VehicleValidation.validateFilters(req.query);
    const { items, pagination } = await VehicleService.getVehiclesByUserId(userId, params, filters);
    ResponseUtil.success(res, { vehicles: items }, HTTP_STATUS.OK, pagination);
  };

  public static getVehicleById = async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      throw new HttpError(HTTP_STATUS.UNAUTHORIZED, 'User not authenticated');
    }

    const vehicleId = VehicleValidation.validateVehicleId(req.params.id);
    const vehicle = await VehicleService.getVehicleById(vehicleId, userId);
    ResponseUtil.success(res, { vehicle }, HTTP_STATUS.OK);
  };

  public static createVehicle = async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      throw new HttpError(HTTP_STATUS.UNAUTHORIZED, 'User not authenticated');
    }

    const validatedData = VehicleValidation.validateCreateVehicle(req.body);
    const vehicle = await VehicleService.createVehicle({
      ...validatedData,
      profile_id: userId,
    });
    ResponseUtil.success(res, { vehicle }, HTTP_STATUS.CREATED);
  };

  public static updateVehicle = async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      throw new HttpError(HTTP_STATUS.UNAUTHORIZED, 'User not authenticated');
    }

    const vehicleId = VehicleValidation.validateVehicleId(req.params.id);
    const validatedData = VehicleValidation.validateUpdateVehicle(req.body);
    const vehicle = await VehicleService.updateVehicle({
      ...validatedData,
      id: vehicleId,
      profile_id: userId,
    });
    ResponseUtil.success(res, { vehicle }, HTTP_STATUS.OK);
  };

  public static deleteVehicle = async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      throw new HttpError(HTTP_STATUS.UNAUTHORIZED, 'User not authenticated');
    }

    const vehicleId = VehicleValidation.validateVehicleId(req.params.id);
    await VehicleService.deleteVehicle(vehicleId, userId);
    ResponseUtil.success(res, { message: 'Vehicle deleted successfully' }, HTTP_STATUS.OK);
  };
}
