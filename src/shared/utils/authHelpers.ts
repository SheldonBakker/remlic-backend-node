import type { AuthenticatedRequest, IAuthUser } from '../types/request.js';
import { HttpError } from '../types/errors/appError.js';
import { HTTP_STATUS } from '../constants/httpStatus.js';

export function requireUser(req: AuthenticatedRequest): IAuthUser {
  if (!req.user) {
    throw new HttpError(HTTP_STATUS.UNAUTHORIZED, 'Unauthorized');
  }
  return req.user;
}
