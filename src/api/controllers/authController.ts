import type { Request, Response, NextFunction } from 'express';
import { ResponseUtil } from '../../shared/utils/response.js';
import { HTTP_STATUS } from '../../shared/constants/httpStatus.js';
import { Logger } from '../../shared/utils/logger.js';
import AuthService from '../../infrastructure/database/auth/authMethods.js';
import { AuthValidation } from '../../infrastructure/database/auth/validation.js';

export default class AuthController {
  public static signup = async (
    req: Request,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const validatedData = AuthValidation.validateSignup(req.body);
    const result = await AuthService.signup(validatedData);

    ResponseUtil.success(res, result, HTTP_STATUS.CREATED);
  };
}
