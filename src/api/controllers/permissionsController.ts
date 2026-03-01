import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../../shared/types/request';
import { ResponseUtil } from '../../shared/utils/response';
import { HTTP_STATUS } from '../../shared/constants/httpStatus';
import {
  getPermissions,
  getPermissionById,
  createPermission,
  updatePermission,
  deletePermission,
} from '../../infrastructure/database/permissions/permissionsMethods';
import { PermissionsValidation } from '../../infrastructure/database/permissions/validation';
import { PaginationUtil } from '../../shared/utils/pagination';

export const list = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (typeof req.query.id === 'string') {
      const permissionId = PermissionsValidation.validatePermissionId(req.query.id);
      const permission = await getPermissionById(permissionId);
      ResponseUtil.success(res, { permission }, HTTP_STATUS.OK);
      return;
    }
    const params = PaginationUtil.parseQuery(req.query);
    const { items, pagination } = await getPermissions(params);
    ResponseUtil.success(res, { permissions: items }, HTTP_STATUS.OK, pagination);
  } catch (error) {
    next(error);
  }
};

export const create = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validatedData = PermissionsValidation.validateCreatePermission(req.body);
    const permission = await createPermission(validatedData);
    ResponseUtil.success(res, { permission }, HTTP_STATUS.CREATED);
  } catch (error) {
    next(error);
  }
};

export const update = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const permissionId = PermissionsValidation.validatePermissionId(req.params.id);
    const validatedData = PermissionsValidation.validateUpdatePermission(req.body);
    const permission = await updatePermission(permissionId, validatedData);
    ResponseUtil.success(res, { permission }, HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};

export const remove = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const permissionId = PermissionsValidation.validatePermissionId(req.params.id);
    await deletePermission(permissionId);
    ResponseUtil.success(res, { message: 'Permission deleted successfully' }, HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};
