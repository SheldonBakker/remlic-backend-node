import type { Request, Response, NextFunction } from 'express';
import { ResponseUtil } from '../../shared/utils/response.js';
import { HTTP_STATUS } from '../../shared/constants/httpStatus.js';

interface IHealthResponse {
  status: 'healthy' | 'unhealthy';
  version: string;
  timestamp: string;
  uptime: number;
}

export default class HealthController {
  public static check = async (
    _req: Request,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const healthData: IHealthResponse = {
      status: 'healthy',
      version: process.env.API_VERSION ?? 'v1',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };

    await Promise.resolve();
    ResponseUtil.success(res, healthData, HTTP_STATUS.OK);
  };
}
