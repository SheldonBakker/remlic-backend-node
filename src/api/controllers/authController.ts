import type { Request, Response, NextFunction } from 'express';
import { ResponseUtil } from '../../shared/utils/response';
import { HTTP_STATUS } from '../../shared/constants/httpStatus';
import { signup as signupUser } from '../../infrastructure/database/auth/authMethods';
import { AuthValidation } from '../../infrastructure/database/auth/validation';

export const signup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validatedData = AuthValidation.validateSignup(req.body);
    const result = await signupUser(validatedData);
    ResponseUtil.success(res, result, HTTP_STATUS.CREATED);
  } catch (error) {
    next(error);
  }
};
