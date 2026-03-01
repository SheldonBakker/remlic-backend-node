import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../../shared/types/request';
import { ResponseUtil } from '../../shared/utils/response';
import { HTTP_STATUS } from '../../shared/constants/httpStatus';
import { HttpError } from '../../shared/types/errors/appError';
import { requireUser } from '../../shared/utils/authHelpers';
import { getProfileById, deleteAccount } from '../../infrastructure/database/auth/authMethods';

export const get = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: userId } = requireUser(req);
    const profile = await getProfileById(userId);
    if (!profile) {
      throw new HttpError(HTTP_STATUS.NOT_FOUND, 'Profile not found');
    }
    ResponseUtil.success(res, { profile }, HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};

export const remove = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: userId } = requireUser(req);
    await deleteAccount(userId);
    ResponseUtil.success(res, { message: 'Account deleted successfully' }, HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};
