import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../../shared/types/request.js';
import { ResponseUtil } from '../../shared/utils/response.js';
import { HTTP_STATUS } from '../../shared/constants/httpStatus.js';
import { HttpError } from '../../shared/types/errors/appError.js';
import PackagesService from '../../infrastructure/database/packages/packagesMethods.js';
import { PackagesValidation } from '../../infrastructure/database/packages/validation.js';
import { PaginationUtil } from '../../shared/utils/pagination.js';

export default class PackagesController {
  public static getPackages = async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      throw new HttpError(HTTP_STATUS.UNAUTHORIZED, 'User not authenticated');
    }

    const params = PaginationUtil.parseQuery(req.query);
    const filters = PackagesValidation.validateFilters(req.query);
    const { items, pagination } = await PackagesService.getPackages(params, filters);
    ResponseUtil.success(res, { packages: items }, HTTP_STATUS.OK, pagination);
  };

  public static getPackageById = async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      throw new HttpError(HTTP_STATUS.UNAUTHORIZED, 'User not authenticated');
    }

    const packageId = PackagesValidation.validatePackageId(req.params.id);
    const pkg = await PackagesService.getPackageById(packageId);
    ResponseUtil.success(res, { package: pkg }, HTTP_STATUS.OK);
  };

  public static getPackageBySlug = async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      throw new HttpError(HTTP_STATUS.UNAUTHORIZED, 'User not authenticated');
    }

    const slug = PackagesValidation.validateSlug(req.params.slug);
    const pkg = await PackagesService.getPackageBySlug(slug);
    ResponseUtil.success(res, { package: pkg }, HTTP_STATUS.OK);
  };

  public static createPackage = async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      throw new HttpError(HTTP_STATUS.UNAUTHORIZED, 'User not authenticated');
    }

    const validatedData = PackagesValidation.validateCreatePackage(req.body);
    const pkg = await PackagesService.createPackage(validatedData);
    ResponseUtil.success(res, { package: pkg }, HTTP_STATUS.CREATED);
  };

  public static updatePackage = async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      throw new HttpError(HTTP_STATUS.UNAUTHORIZED, 'User not authenticated');
    }

    const packageId = PackagesValidation.validatePackageId(req.params.id);
    const validatedData = PackagesValidation.validateUpdatePackage(req.body);
    const pkg = await PackagesService.updatePackage(packageId, validatedData);
    ResponseUtil.success(res, { package: pkg }, HTTP_STATUS.OK);
  };

  public static deletePackage = async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      throw new HttpError(HTTP_STATUS.UNAUTHORIZED, 'User not authenticated');
    }

    const packageId = PackagesValidation.validatePackageId(req.params.id);
    await PackagesService.deletePackage(packageId);
    ResponseUtil.success(res, { message: 'Package deactivated successfully' }, HTTP_STATUS.OK);
  };
}
