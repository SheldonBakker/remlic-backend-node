import type { Request, Response, NextFunction } from 'express';
import { ResponseUtil } from '../../shared/utils/response';
import { HTTP_STATUS } from '../../shared/constants/httpStatus';

interface IHealthResponse {
  status: 'healthy' | 'unhealthy';
  version: string;
  timestamp: string;
  uptime: number;
}

export const check = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const healthData: IHealthResponse = {
      status: 'healthy',
      version: process.env.API_VERSION ?? 'v1',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
    await Promise.resolve();
    ResponseUtil.success(res, healthData, HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};
