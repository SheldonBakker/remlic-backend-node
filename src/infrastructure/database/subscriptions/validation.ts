import { z } from 'zod';
import type {
  ICreateSubscriptionRequest,
  IUpdateSubscriptionRequest,
  ISubscriptionsFilters,
  IInitializeSubscriptionRequest,
  IChangePlanRequest,
} from './types.js';
import { dateSchema, createUuidSchema, withAtLeastOneField } from '../../../shared/schemas/common.js';
import { validateOrThrow, validateIdOrThrow } from '../../../shared/utils/validationHelper.js';

const subscriptionStatusEnum = z.enum(['active', 'expired', 'cancelled', 'refunded']);

const createSubscriptionSchema = z.object({
  profile_id: z.string().uuid('Invalid profile ID format'),
  package_id: z.string().uuid('Invalid package ID format'),
  start_date: dateSchema,
  end_date: dateSchema,
}).strict().refine((data) => {
  const start = new Date(data.start_date);
  const end = new Date(data.end_date);
  return end >= start;
}, {
  message: 'End date must be on or after start date',
});

const updateSubscriptionSchema = withAtLeastOneField(z.object({
  package_id: z.string().uuid('Invalid package ID format').optional(),
  start_date: dateSchema.optional(),
  end_date: dateSchema.optional(),
  status: subscriptionStatusEnum.optional(),
}).strict()).refine((data) => {
  if (data.start_date && data.end_date) {
    const start = new Date(data.start_date);
    const end = new Date(data.end_date);
    return end >= start;
  }
  return true;
}, {
  message: 'End date must be on or after start date',
});

const subscriptionIdSchema = createUuidSchema('subscription');

const subscriptionsFiltersSchema = z.object({
  status: subscriptionStatusEnum.optional(),
  profile_id: z.string().uuid('Invalid profile ID format').optional(),
}).passthrough();

const initializeSubscriptionSchema = z.object({
  package_id: z.string().uuid('Invalid package ID format'),
  callback_url: z.string().url('Invalid callback URL'),
}).strict();

const changePlanSchema = z.object({
  new_package_id: z.string().uuid('Invalid package ID format'),
  callback_url: z.string().url('Invalid callback URL'),
}).strict();

export class SubscriptionsValidation {
  public static validateCreateSubscription(data: unknown): ICreateSubscriptionRequest {
    return validateOrThrow(createSubscriptionSchema, data);
  }

  public static validateSubscriptionId(id: unknown): string {
    return validateIdOrThrow(subscriptionIdSchema, id, 'Invalid subscription ID format');
  }

  public static validateFilters(query: unknown): ISubscriptionsFilters {
    return validateOrThrow(subscriptionsFiltersSchema, query, 'Invalid filter parameters');
  }

  public static validateUpdateSubscription(data: unknown): IUpdateSubscriptionRequest {
    return validateOrThrow(updateSubscriptionSchema, data);
  }

  public static validateInitializeSubscription(data: unknown): IInitializeSubscriptionRequest {
    return validateOrThrow(initializeSubscriptionSchema, data);
  }

  public static validateChangePlan(data: unknown): IChangePlanRequest {
    return validateOrThrow(changePlanSchema, data);
  }
}
