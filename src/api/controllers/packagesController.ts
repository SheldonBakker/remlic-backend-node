import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../../shared/types/request';
import { ResponseUtil } from '../../shared/utils/response';
import { HTTP_STATUS } from '../../shared/constants/httpStatus';
import {
  getPackages,
  getPackageById,
  getPackageBySlug,
  createPackage,
  updatePackage,
  deletePackage,
} from '../../infrastructure/database/packages/packagesMethods';
import { PackagesValidation } from '../../infrastructure/database/packages/validation';
import { PaginationUtil } from '../../shared/utils/pagination';

export const list = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (typeof req.query.id === 'string') {
      const packageId = PackagesValidation.validatePackageId(req.query.id);
      const pkg = await getPackageById(packageId);
      ResponseUtil.success(res, { package: pkg }, HTTP_STATUS.OK);
      return;
    }
    const params = PaginationUtil.parseQuery(req.query);
    const filters = PackagesValidation.validateFilters(req.query);
    const { items, pagination } = await getPackages(params, filters);
    ResponseUtil.success(res, { packages: items }, HTTP_STATUS.OK, pagination);
  } catch (error) {
    next(error);
  }
};

export const getBySlug = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const slug = PackagesValidation.validateSlug(req.params.slug);
    const pkg = await getPackageBySlug(slug);
    ResponseUtil.success(res, { package: pkg }, HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};

export const create = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validatedData = PackagesValidation.validateCreatePackage(req.body);
    const pkg = await createPackage(validatedData);
    ResponseUtil.success(res, { package: pkg }, HTTP_STATUS.CREATED);
  } catch (error) {
    next(error);
  }
};

export const update = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const packageId = PackagesValidation.validatePackageId(req.params.id);
    const validatedData = PackagesValidation.validateUpdatePackage(req.body);
    const pkg = await updatePackage(packageId, validatedData);
    ResponseUtil.success(res, { package: pkg }, HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};

export const remove = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const packageId = PackagesValidation.validatePackageId(req.params.id);
    await deletePackage(packageId);
    ResponseUtil.success(res, { message: 'Package deactivated successfully' }, HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};
