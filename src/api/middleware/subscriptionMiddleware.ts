import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../../shared/types/request';
import type { IUserPermissions } from '../../infrastructure/database/subscriptions/types';
import { HTTP_STATUS } from '../../shared/constants/httpStatus';
import { UserRole } from '../../shared/types/auth';
import Logger from '../../shared/utils/logger';
import { ResponseUtil } from '../../shared/utils/response';
import { getUserPermissions as getDbUserPermissions } from '../../infrastructure/database/subscriptions/subscriptionsMethods';
import { getRouteFeature, type SubscriptionFeature } from './subscriptionRouteConfig';

const CONTEXT = 'SUBSCRIPTION_MIDDLEWARE';

const isAdminUser = (req: AuthenticatedRequest): boolean => {
  return req.user?.appRole === UserRole.ADMIN;
};

const getUserPermissions = async (req: AuthenticatedRequest): Promise<IUserPermissions> => {
  if (req.user?.permissions) {
    return req.user.permissions;
  }

  const userId = req.user?.id;
  if (!userId || !req.user) {
    throw new Error('User not authenticated');
  }

  const permissions = await getDbUserPermissions(userId);
  req.user.permissions = permissions;
  return permissions;
};

const requireSubscriptionAccess = (...requiredFeatures: SubscriptionFeature[]) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user?.id) {
        ResponseUtil.error(res, 'User not authenticated', HTTP_STATUS.UNAUTHORIZED);
        return;
      }

      if (isAdminUser(req)) {
        next();
        return;
      }

      const permissions = await getUserPermissions(req);

      const hasAccess = requiredFeatures.some((feature) => permissions[feature]);

      if (!hasAccess) {
        Logger.warn(CONTEXT, `Subscription access denied (userId: ${req.user.id})`);
        ResponseUtil.error(res, 'Active subscription required to access this resource', HTTP_STATUS.FORBIDDEN);
        return;
      }

      next();
    } catch (error) {
      Logger.error(CONTEXT, 'Subscription check failed', error);
      ResponseUtil.error(res, 'Failed to verify subscription access', HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  };
};

export const requireRouteSubscription = (
  basePath: string,
): ((req: AuthenticatedRequest, res: Response, next: NextFunction)=> Promise<void>) => {
  const feature = getRouteFeature(basePath);
  if (!feature) {
    throw new Error(`No subscription config found for route: ${basePath}`);
  }
  return requireSubscriptionAccess(feature);
};

export const requireAnySubscription = () => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user?.id) {
        ResponseUtil.error(res, 'User not authenticated', HTTP_STATUS.UNAUTHORIZED);
        return;
      }

      if (isAdminUser(req)) {
        next();
        return;
      }

      const permissions = await getUserPermissions(req);

      if (permissions.active_subscriptions === 0) {
        Logger.warn(CONTEXT, `No active subscription (userId: ${req.user.id})`);
        ResponseUtil.error(res, 'Active subscription required to access this resource', HTTP_STATUS.FORBIDDEN);
        return;
      }

      next();
    } catch (error) {
      Logger.error(CONTEXT, 'Subscription check failed', error);
      ResponseUtil.error(res, 'Failed to verify subscription access', HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  };
};

