import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../../shared/types/errors/appError';
import type { IErrorResponse } from '../../shared/types/apiResponse';
import { HTTP_STATUS } from '../../shared/constants/httpStatus';
import Logger from '../../shared/utils/logger';

const CONTEXT = 'ERROR_HANDLER';

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (error instanceof ZodError) {
    const statusCode = HTTP_STATUS.UNPROCESSABLE_ENTITY;
    const errorResponse = {
      success: false,
      error: {
        message: error.errors[0]?.message ?? 'Validation error',
        statusCode,
        timestamp: new Date().toISOString(),
        path: req.path,
        details: error.errors,
      },
    };
    res.status(statusCode).json(errorResponse);
    return;
  }

  const isHttpError = error instanceof HttpError;

  const statusCode = isHttpError ? error.statusCode : HTTP_STATUS.INTERNAL_SERVER_ERROR;
  const message = isHttpError ? error.message : 'Internal server error';

  Logger.error(CONTEXT, `${req.method} ${req.path} - ${message}`, error);

  const errorResponse: IErrorResponse = {
    success: false,
    error: {
      message,
      statusCode,
      timestamp: new Date().toISOString(),
      path: req.path,
    },
  };

  res.status(statusCode).json(errorResponse);
};
