import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../../shared/types/request';
import { ResponseUtil } from '../../shared/utils/response';
import { HTTP_STATUS } from '../../shared/constants/httpStatus';
import { requireUser } from '../../shared/utils/authHelpers';
import {
  getFirearmsByUserId,
  getFirearmById,
  createFirearm,
  updateFirearm,
  deleteFirearm,
} from '../../infrastructure/database/firearms/firearmsMethods';
import { FirearmsValidation } from '../../infrastructure/database/firearms/validation';
import { PaginationUtil } from '../../shared/utils/pagination';

export const list = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: userId } = requireUser(req);
    if (typeof req.query.id === 'string') {
      const firearmId = FirearmsValidation.validateFirearmId(req.query.id);
      const firearm = await getFirearmById(firearmId, userId);
      ResponseUtil.success(res, { firearm }, HTTP_STATUS.OK);
      return;
    }
    const params = PaginationUtil.parseQuery(req.query);
    const filters = FirearmsValidation.validateFilters(req.query);
    const { items, pagination } = await getFirearmsByUserId(userId, params, filters);
    ResponseUtil.success(res, { firearms: items }, HTTP_STATUS.OK, pagination);
  } catch (error) {
    next(error);
  }
};

export const create = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: userId } = requireUser(req);
    const validatedData = FirearmsValidation.validateCreateFirearm(req.body);
    const firearm = await createFirearm({ ...validatedData, profile_id: userId });
    ResponseUtil.success(res, { firearm }, HTTP_STATUS.CREATED);
  } catch (error) {
    next(error);
  }
};

export const update = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: userId } = requireUser(req);
    const firearmId = FirearmsValidation.validateFirearmId(req.params.id);
    const validatedData = FirearmsValidation.validateUpdateFirearm(req.body);
    const firearm = await updateFirearm({ ...validatedData, id: firearmId, profile_id: userId });
    ResponseUtil.success(res, { firearm }, HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};

export const remove = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: userId } = requireUser(req);
    const firearmId = FirearmsValidation.validateFirearmId(req.params.id);
    await deleteFirearm(firearmId, userId);
    ResponseUtil.success(res, { message: 'Firearm deleted successfully' }, HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};
