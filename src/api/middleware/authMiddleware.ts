import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../../shared/types/request.js';
import { HTTP_STATUS } from '../../shared/constants/httpStatus.js';
import { Logger } from '../../shared/utils/logger.js';
import { ResponseUtil } from '../../shared/utils/response.js';
import { UserRole } from '../../shared/types/auth.js';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { config } from '../../infrastructure/config/env.config.js';

export { UserRole };

interface SupabaseJwtPayload extends JWTPayload {
  sub: string;
  email?: string;
  role?: string;
  app_metadata?: {
    role?: string;
  };
}

const JWKS = createRemoteJWKSet(
  new URL(`${config.supabase.url}/auth/v1/.well-known/jwks.json`),
);

const isValidRole = (role: unknown): role is UserRole => {
  return role === UserRole.USER || role === UserRole.ADMIN;
};

export const requireRole = (...allowedRoles: UserRole[]) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader?.startsWith('Bearer ')) {
        ResponseUtil.error(res, 'Missing or invalid authorization header', HTTP_STATUS.UNAUTHORIZED);
        return;
      }

      const token = authHeader.split(' ')[1];

      if (!token) {
        ResponseUtil.error(res, 'Token not provided', HTTP_STATUS.UNAUTHORIZED);
        return;
      }

      let payload: SupabaseJwtPayload;
      try {
        const result = await jwtVerify(token, JWKS, {
          issuer: `${config.supabase.url}/auth/v1`,
          audience: 'authenticated',
        });
        payload = result.payload as SupabaseJwtPayload;
      } catch (jwtError) {
        Logger.warn('JWT verification failed', 'AUTH_MIDDLEWARE', {
          error: (jwtError as Error).message,
        });
        ResponseUtil.error(res, 'Invalid token', HTTP_STATUS.UNAUTHORIZED);
        return;
      }

      const appRole = payload.app_metadata?.role as UserRole | undefined;

      req.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        appRole: appRole ?? null,
      };

      if (appRole === UserRole.ADMIN) {
        next();
        return;
      }

      if (!isValidRole(appRole) || !allowedRoles.includes(appRole)) {
        Logger.warn('Access denied - insufficient role', 'AUTH_MIDDLEWARE', {
          userId: req.user.id,
          userRole: appRole,
          requiredRoles: allowedRoles,
        });
        ResponseUtil.error(res, 'You do not have permission to access this resource', HTTP_STATUS.FORBIDDEN);
        return;
      }

      next();
    } catch (error) {
      Logger.error('JWT verification failed', 'AUTH_MIDDLEWARE', { error });
      ResponseUtil.error(res, 'Authentication failed', HTTP_STATUS.UNAUTHORIZED);
    }
  };
};
