import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../../shared/types/request';
import { ResponseUtil } from '../../shared/utils/response';
import { HTTP_STATUS } from '../../shared/constants/httpStatus';
import { requireUser } from '../../shared/utils/authHelpers';
import {
  getApplicantDetails,
  getOfficersByUserId,
  createOfficer,
  deleteOfficer,
} from '../../infrastructure/database/psira/psiraMethods';
import { PsiraValidation } from '../../infrastructure/database/psira/validation';
import { PaginationUtil } from '../../shared/utils/pagination';

export const getApplicant = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const idNumber = PsiraValidation.validateIdNumber(req.params.idNumber);
    const officers = await getApplicantDetails(idNumber);
    ResponseUtil.success(res, { officers }, HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};

export const list = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: userId } = requireUser(req);
    const params = PaginationUtil.parseQuery(req.query);
    const filters = PsiraValidation.validateFilters(req.query);
    const { items, pagination } = await getOfficersByUserId(userId, params, filters);
    ResponseUtil.success(res, { officers: items }, HTTP_STATUS.OK, pagination);
  } catch (error) {
    next(error);
  }
};

export const create = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: userId } = requireUser(req);
    const validatedData = PsiraValidation.validateCreateOfficer(req.body);
    const officer = await createOfficer(validatedData, userId);
    ResponseUtil.success(res, { officer }, HTTP_STATUS.CREATED);
  } catch (error) {
    next(error);
  }
};

export const remove = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: userId } = requireUser(req);
    const officerId = PsiraValidation.validateOfficerId(req.params.id);
    await deleteOfficer(officerId, userId);
    ResponseUtil.success(res, { message: 'Officer deleted successfully' }, HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};
