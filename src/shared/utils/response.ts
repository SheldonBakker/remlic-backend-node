import type { Response } from 'express';
import type { IApiResponse, IApiErrorResponse, IPagination } from '../types/apiResponse';

export class ResponseUtil {
  public static success<T>(
    res: Response,
    data: T,
    statusCode = 200,
    pagination: IPagination | null = null,
  ): void {
    const response: IApiResponse<T> = {
      success: true,
      data,
      pagination,
      timestamp: new Date().toISOString(),
      statusCode,
    };

    res.status(statusCode).json(response);
  }

  public static error(
    res: Response,
    message: string,
    statusCode = 500,
    details: unknown = null,
  ): void {
    const response: IApiErrorResponse = {
      success: false,
      error: message,
      details: process.env.NODE_ENV !== 'production' ? details : null,
      timestamp: new Date().toISOString(),
      statusCode,
    };

    res.status(statusCode).json(response);
  }
}
