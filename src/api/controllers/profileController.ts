import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../../shared/types/request.js';
import { ResponseUtil } from '../../shared/utils/response.js';
import { HTTP_STATUS } from '../../shared/constants/httpStatus.js';
import { HttpError } from '../../shared/types/errors/appError.js';
import AuthService from '../../infrastructure/database/auth/authMethods.js';

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
}
