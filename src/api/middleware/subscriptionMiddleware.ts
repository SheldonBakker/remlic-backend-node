import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../../shared/types/request.js';
import type { IUserPermissions } from '../../infrastructure/database/subscriptions/types.js';
import type { EntityType } from '../../infrastructure/database/reminders/types.js';
import { HTTP_STATUS } from '../../shared/constants/httpStatus.js';
import { ENTITY_TO_PERMISSION } from '../../shared/constants/entities.js';
import { UserRole } from '../../shared/types/auth.js';
import { Logger } from '../../shared/utils/logger.js';
import { ResponseUtil } from '../../shared/utils/response.js';
import SubscriptionsService from '../../infrastructure/database/subscriptions/subscriptionsMethods.js';
import { getRouteFeature, type SubscriptionFeature } from './subscriptionRouteConfig.js';

export type { SubscriptionFeature };

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

  const permissions = await SubscriptionsService.getUserPermissions(userId);
  req.user.permissions = permissions;
  return permissions;
};

export const requireSubscriptionAccess = (...requiredFeatures: SubscriptionFeature[]) => {
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
        Logger.warn('Subscription access denied', 'SUBSCRIPTION_MIDDLEWARE', {
          userId: req.user.id,
          requiredFeatures,
          userPermissions: permissions,
        });
        ResponseUtil.error(res, 'Active subscription required to access this resource', HTTP_STATUS.FORBIDDEN);
        return;
      }

      next();
    } catch (error) {
      Logger.error('Subscription check failed', 'SUBSCRIPTION_MIDDLEWARE', { error });
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
        Logger.warn('No active subscription', 'SUBSCRIPTION_MIDDLEWARE', {
          userId: req.user.id,
        });
        ResponseUtil.error(res, 'Active subscription required to access this resource', HTTP_STATUS.FORBIDDEN);
        return;
      }

      next();
    } catch (error) {
      Logger.error('Subscription check failed', 'SUBSCRIPTION_MIDDLEWARE', { error });
      ResponseUtil.error(res, 'Failed to verify subscription access', HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  };
};

export const requireEntityTypeAccess = () => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user?.id) {
        ResponseUtil.error(res, 'User not authenticated', HTTP_STATUS.UNAUTHORIZED);
        return;
      }

      const entityType = (req.params.entityType ?? req.body?.entity_type) as EntityType | undefined;

      if (!entityType) {
        ResponseUtil.error(res, 'Invalid entity type', HTTP_STATUS.BAD_REQUEST);
        return;
      }

      if (isAdminUser(req)) {
        next();
        return;
      }

      const permissions = await getUserPermissions(req);
      const requiredFeature = ENTITY_TO_PERMISSION[entityType];

      if (!permissions[requiredFeature]) {
        Logger.warn('Entity type access denied', 'SUBSCRIPTION_MIDDLEWARE', {
          userId: req.user.id,
          entityType,
          requiredFeature,
        });
        ResponseUtil.error(
          res,
          `Active subscription with ${entityType.replace('_', ' ')} access required`,
          HTTP_STATUS.FORBIDDEN,
        );
        return;
      }

      next();
    } catch (error) {
      Logger.error('Entity type access check failed', 'SUBSCRIPTION_MIDDLEWARE', { error });
      ResponseUtil.error(res, 'Failed to verify subscription access', HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  };
};
