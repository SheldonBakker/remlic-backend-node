import type { Request, Response, NextFunction } from 'express';
import { HttpError } from '../../shared/types/errors/appError.js';
import { ResponseUtil } from '../../shared/utils/response.js';
import { Logger } from '../../shared/utils/logger.js';
import { HTTP_STATUS } from '../../shared/constants/httpStatus.js';

export const errorHandler = (
  err: Error | HttpError,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (err instanceof HttpError) {
    ResponseUtil.error(res, err.message, err.statusCode, err.details);
    return;
  }

  Logger.error('Unexpected error', 'ERROR_HANDLER', {
    error: err.message,
    stack: err.stack,
    path: req.path,
  });

  ResponseUtil.error(
    res,
    process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    HTTP_STATUS.INTERNAL_SERVER_ERROR,
  );
};
