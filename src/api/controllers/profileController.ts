import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../../shared/types/request';
import { ResponseUtil } from '../../shared/utils/response';
import { HTTP_STATUS } from '../../shared/constants/httpStatus';
import { HttpError } from '../../shared/types/errors/appError';
import AuthService from '../../infrastructure/database/auth/authMethods';

export default class ProfileController {
  public static getProfile = async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      throw new HttpError(HTTP_STATUS.UNAUTHORIZED, 'User not authenticated');
    }

    const profile = await AuthService.getProfileById(userId);

    if (!profile) {
      throw new HttpError(HTTP_STATUS.NOT_FOUND, 'Profile not found');
    }

    ResponseUtil.success(res, { profile }, HTTP_STATUS.OK);
  };

  public static deleteProfile = async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      throw new HttpError(HTTP_STATUS.UNAUTHORIZED, 'User not authenticated');
    }

    await AuthService.deleteAccount(userId);

    ResponseUtil.success(res, { message: 'Account deleted successfully' }, HTTP_STATUS.OK);
  };
}
