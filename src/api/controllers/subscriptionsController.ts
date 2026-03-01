import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../../shared/types/request';
import { ResponseUtil } from '../../shared/utils/response';
import { HTTP_STATUS } from '../../shared/constants/httpStatus';
import { UserRole } from '../../shared/types/auth';
import { requireUser } from '../../shared/utils/authHelpers';
import { HttpError } from '../../shared/types/errors/appError';
import {
  getSubscriptions,
  getUserPermissions,
  updateSubscription,
  cancelSubscription as cancelSub,
} from '../../infrastructure/database/subscriptions/subscriptionsMethods';
import type { ISubscriptionsFilters } from '../../infrastructure/database/subscriptions/types';
import { SubscriptionsValidation } from '../../infrastructure/database/subscriptions/validation';
import { PaginationUtil } from '../../shared/utils/pagination';
import { SubscriptionUseCases } from '../../useCase/subscriptionUseCases';

export const updateSubscriptionHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const subscriptionId = SubscriptionsValidation.validateSubscriptionId(req.params.id);
    const validatedData = SubscriptionsValidation.validateUpdateSubscription(req.body);
    const subscription = await updateSubscription(subscriptionId, validatedData);
    ResponseUtil.success(res, { subscription }, HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};

export const cancelSubscriptionHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const subscriptionId = SubscriptionsValidation.validateSubscriptionId(req.params.id);
    await cancelSub(subscriptionId);
    ResponseUtil.success(res, { message: 'Subscription cancelled successfully' }, HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};

export const getMySubscriptions = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = requireUser(req);
    const params = PaginationUtil.parseQuery(req.query);
    const { status = 'active' } = SubscriptionsValidation.validateFilters(req.query);
    const filters: ISubscriptionsFilters = user.appRole === UserRole.ADMIN
      ? { status }
      : { status, profile_id: user.id };
    const { items, pagination } = await getSubscriptions(params, filters);
    ResponseUtil.success(res, { subscriptions: items }, HTTP_STATUS.OK, pagination);
  } catch (error) {
    next(error);
  }
};

export const getMyPermissions = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: userId } = requireUser(req);
    const permissions = await getUserPermissions(userId);
    ResponseUtil.success(res, { permissions }, HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};

export const getCurrentSubscription = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: userId } = requireUser(req);
    const subscription = await SubscriptionUseCases.getCurrentSubscription(userId);
    ResponseUtil.success(res, { subscription }, HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};

export const subscriptionActionHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = requireUser(req);
    const { action, id } = req.query;

    if (action === 'initialize') {
      const validatedData = SubscriptionsValidation.validateInitializeSubscription(req.body);
      const result = await SubscriptionUseCases.initializeSubscription(user.id, validatedData);
      ResponseUtil.success(res, result, HTTP_STATUS.OK);
    } else if (action === 'cancel') {
      const subscriptionId = SubscriptionsValidation.validateSubscriptionId(id);
      if (user.appRole === UserRole.ADMIN) {
        await cancelSub(subscriptionId);
      } else {
        await SubscriptionUseCases.cancelSubscription(user.id, subscriptionId);
      }
      ResponseUtil.success(res, { message: 'Subscription cancelled successfully' }, HTTP_STATUS.OK);
    } else if (action === 'refund') {
      const subscriptionId = SubscriptionsValidation.validateSubscriptionId(id);
      await SubscriptionUseCases.refundSubscription(user.id, subscriptionId);
      ResponseUtil.success(res, { message: 'Subscription refunded successfully' }, HTTP_STATUS.OK);
    } else if (action === 'change-plan') {
      const subscriptionId = SubscriptionsValidation.validateSubscriptionId(id);
      const validatedData = SubscriptionsValidation.validateChangePlan(req.body);
      const result = await SubscriptionUseCases.changePlan(user.id, subscriptionId, validatedData);
      ResponseUtil.success(res, result, HTTP_STATUS.OK);
    } else {
      throw new HttpError(HTTP_STATUS.BAD_REQUEST, 'Invalid action. Must be one of: initialize, cancel, refund, change-plan');
    }
  } catch (error) {
    next(error);
  }
};
