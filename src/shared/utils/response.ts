import type { Response } from 'express';
import type { IApiResponse, IApiErrorResponse, IPagination } from '../types/apiResponse.js';

export class ResponseUtil {
  public static success<T>(
    res: Response,
    data: T,
    statusCode = 200,
    pagination?: IPagination,
  ): void {
    const response: IApiResponse<T> = {
      success: true,
      data,
      timestamp: new Date().toISOString(),
      statusCode,
    };

    if (pagination) {
      response.pagination = pagination;
    }

    res.status(statusCode).json(response);
  }

  public static error(
    res: Response,
    message: string,
    statusCode = 500,
    details?: unknown,
  ): void {
    const response: IApiErrorResponse = {
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
      statusCode,
    };

    if (process.env.NODE_ENV !== 'production' && details) {
      response.details = details;
    }

    res.status(statusCode).json(response);
  }
}
