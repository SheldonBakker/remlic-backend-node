import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../../shared/types/request.js';
import { ResponseUtil } from '../../shared/utils/response.js';
import { HTTP_STATUS } from '../../shared/constants/httpStatus.js';
import { HttpError } from '../../shared/types/errors/appError.js';
import SubscriptionsService from '../../infrastructure/database/subscriptions/subscriptionsMethods.js';
import { SubscriptionsValidation } from '../../infrastructure/database/subscriptions/validation.js';
import { PaginationUtil } from '../../shared/utils/pagination.js';
import { SubscriptionUseCases } from '../../usecases/subscriptionUseCases.js';

export default class SubscriptionsController {
  public static getSubscriptions = async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      throw new HttpError(HTTP_STATUS.UNAUTHORIZED, 'User not authenticated');
    }

    const params = PaginationUtil.parseQuery(req.query);
    const filters = SubscriptionsValidation.validateFilters(req.query);
    const { items, pagination } = await SubscriptionsService.getSubscriptions(params, filters);
    ResponseUtil.success(res, { subscriptions: items }, HTTP_STATUS.OK, pagination);
  };

  public static getSubscriptionById = async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      throw new HttpError(HTTP_STATUS.UNAUTHORIZED, 'User not authenticated');
    }

    const subscriptionId = SubscriptionsValidation.validateSubscriptionId(req.params.id);
    const subscription = await SubscriptionsService.getSubscriptionById(subscriptionId);
    ResponseUtil.success(res, { subscription }, HTTP_STATUS.OK);
  };

  public static createSubscription = async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      throw new HttpError(HTTP_STATUS.UNAUTHORIZED, 'User not authenticated');
    }

    const validatedData = SubscriptionsValidation.validateCreateSubscription(req.body);
    const subscription = await SubscriptionsService.createSubscription(validatedData);
    ResponseUtil.success(res, { subscription }, HTTP_STATUS.CREATED);
  };

  public static updateSubscription = async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      throw new HttpError(HTTP_STATUS.UNAUTHORIZED, 'User not authenticated');
    }

    const subscriptionId = SubscriptionsValidation.validateSubscriptionId(req.params.id);
    const validatedData = SubscriptionsValidation.validateUpdateSubscription(req.body);
    const subscription = await SubscriptionsService.updateSubscription(subscriptionId, validatedData);
    ResponseUtil.success(res, { subscription }, HTTP_STATUS.OK);
  };

  public static cancelSubscription = async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      throw new HttpError(HTTP_STATUS.UNAUTHORIZED, 'User not authenticated');
    }

    const subscriptionId = SubscriptionsValidation.validateSubscriptionId(req.params.id);
    await SubscriptionsService.cancelSubscription(subscriptionId);
    ResponseUtil.success(res, { message: 'Subscription cancelled successfully' }, HTTP_STATUS.OK);
  };

  public static getMySubscriptions = async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      throw new HttpError(HTTP_STATUS.UNAUTHORIZED, 'User not authenticated');
    }

    const params = PaginationUtil.parseQuery(req.query);
    const { items, pagination } = await SubscriptionsService.getUserSubscriptions(userId, params);
    ResponseUtil.success(res, { subscriptions: items }, HTTP_STATUS.OK, pagination);
  };

  public static getMyPermissions = async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      throw new HttpError(HTTP_STATUS.UNAUTHORIZED, 'User not authenticated');
    }

    const permissions = await SubscriptionsService.getUserPermissions(userId);
    ResponseUtil.success(res, { permissions }, HTTP_STATUS.OK);
  };

  public static initializeSubscription = async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      throw new HttpError(HTTP_STATUS.UNAUTHORIZED, 'User not authenticated');
    }

    const validatedData = SubscriptionsValidation.validateInitializeSubscription(req.body);
    const result = await SubscriptionUseCases.initializeSubscription(userId, validatedData);
    ResponseUtil.success(res, result, HTTP_STATUS.OK);
  };

  public static cancelMySubscription = async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      throw new HttpError(HTTP_STATUS.UNAUTHORIZED, 'User not authenticated');
    }

    const subscriptionId = SubscriptionsValidation.validateSubscriptionId(req.params.id);
    await SubscriptionUseCases.cancelSubscription(userId, subscriptionId);
    ResponseUtil.success(res, { message: 'Subscription cancelled successfully' }, HTTP_STATUS.OK);
  };

  public static changeSubscriptionPlan = async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      throw new HttpError(HTTP_STATUS.UNAUTHORIZED, 'User not authenticated');
    }

    const subscriptionId = SubscriptionsValidation.validateSubscriptionId(req.params.id);
    const validatedData = SubscriptionsValidation.validateChangePlan(req.body);
    const result = await SubscriptionUseCases.changePlan(userId, subscriptionId, validatedData);
    ResponseUtil.success(res, result, HTTP_STATUS.OK);
  };

  public static getMyCurrentSubscription = async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      throw new HttpError(HTTP_STATUS.UNAUTHORIZED, 'User not authenticated');
    }

    const subscription = await SubscriptionUseCases.getCurrentSubscription(userId);
    ResponseUtil.success(res, { subscription }, HTTP_STATUS.OK);
  };

  public static refundMySubscription = async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      throw new HttpError(HTTP_STATUS.UNAUTHORIZED, 'User not authenticated');
    }

    const subscriptionId = SubscriptionsValidation.validateSubscriptionId(req.params.id);
    await SubscriptionUseCases.refundSubscription(userId, subscriptionId);
    ResponseUtil.success(res, { message: 'Subscription refunded successfully' }, HTTP_STATUS.OK);
  };
}
