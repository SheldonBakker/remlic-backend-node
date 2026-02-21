import { randomUUID } from 'crypto';
import SubscriptionsService from '../infrastructure/database/subscriptions/subscriptionsMethods';
import PackagesService from '../infrastructure/database/packages/packagesMethods';
import type {
  IInitializeSubscriptionRequest,
  IInitializeSubscriptionResponse,
  IChangePlanRequest,
  ISubscriptionWithPackage,
} from '../infrastructure/database/subscriptions/types';
import { HttpError } from '../shared/types/errors/appError';
import { HTTP_STATUS } from '../shared/constants/httpStatus';
import Logger from '../shared/utils/logger';
import db from '../infrastructure/database/databaseClient';
import { profiles } from '../infrastructure/database/schema/index';
import { eq } from 'drizzle-orm';
import { PaystackService } from '../infrastructure/payment/paystackService';
import type { IPaystackWebhookPayload } from '../infrastructure/payment/types';

interface ISubscriptionMetadata {
  user_id?: string;
  package_id?: string;
}

export class SubscriptionUseCases {
  public static async initializeSubscription(
    userId: string,
    request: IInitializeSubscriptionRequest,
  ): Promise<IInitializeSubscriptionResponse> {
    const existingSubscription = await SubscriptionsService.getUserActiveSubscription(userId);
    if (existingSubscription) {
      const isFreeTrial = existingSubscription.app_packages.slug === 'free-trial';
      if (isFreeTrial) {
        await SubscriptionsService.cancelSubscription(existingSubscription.id);
        Logger.info('SUBSCRIPTION_USE_CASES', `Auto-cancelled free trial for user ${userId} upgrading to paid plan`);
      } else {
        if (existingSubscription.package_id === request.package_id) {
          throw new HttpError(HTTP_STATUS.CONFLICT, 'You already have an active subscription to this package');
        }
        throw new HttpError(
          HTTP_STATUS.CONFLICT,
          'You already have an active subscription. Use the change plan endpoint to switch packages.',
        );
      }
    }

    const [profile] = await db
      .select({ id: profiles.id, email: profiles.email })
      .from(profiles)
      .where(eq(profiles.id, userId));

    if (!profile) {
      throw new HttpError(HTTP_STATUS.NOT_FOUND, 'User profile not found');
    }

    if (!profile.email) {
      throw new HttpError(HTTP_STATUS.BAD_REQUEST, 'User email is required for subscription');
    }

    const pkg = await PackagesService.getPackageById(request.package_id);

    if (!pkg.paystack_plan_code) {
      throw new HttpError(HTTP_STATUS.BAD_REQUEST, 'Package does not have a Paystack plan configured');
    }

    const reference = `sub_${userId.substring(0, 8)}_${randomUUID().substring(0, 8)}`;

    const result = await PaystackService.initializeTransaction({
      email: profile.email,
      amount: 0,
      plan: pkg.paystack_plan_code,
      callback_url: request.callback_url,
      reference,
      metadata: {
        user_id: userId,
        package_id: request.package_id,
      },
    });

    if (!result.success || !result.data) {
      throw new HttpError(HTTP_STATUS.BAD_GATEWAY, result.error ?? 'Failed to initialize payment');
    }

    return {
      authorization_url: result.data.authorization_url,
      reference: result.data.reference,
      access_code: result.data.access_code,
    };
  }

  public static async handleWebhookEvent(payload: IPaystackWebhookPayload): Promise<void> {
    const { event, data } = payload;

    switch (event) {
      case 'charge.success':
        await SubscriptionUseCases.handleChargeSuccess(payload);
        break;

      case 'subscription.disable':
      case 'subscription.not_renew':
        if (data.subscription_code) {
          await SubscriptionsService.markCancelledByPaystack(data.subscription_code);
        }
        break;

      case 'invoice.payment_failed':
        Logger.warn('SUBSCRIPTION_USE_CASES', `Payment failed for subscription: ${data.subscription_code}`);
        break;

      default:
        break;
    }
  }

  private static async handleChargeSuccess(payload: IPaystackWebhookPayload): Promise<void> {
    const { data } = payload;
    const metadata = (data.metadata as ISubscriptionMetadata | undefined) ?? null;

    if (metadata?.user_id && metadata.package_id) {
      await SubscriptionUseCases.createInitialSubscription(data, metadata.user_id, metadata.package_id);
      return;
    }

    if (data.subscription_code) {
      await SubscriptionUseCases.renewExistingSubscription(data.subscription_code);
    }
  }

  private static async createInitialSubscription(
    data: IPaystackWebhookPayload['data'],
    userId: string,
    packageId: string,
  ): Promise<void> {
    const pkg = await PackagesService.getPackageById(packageId);
    const endDate = new Date();
    if (pkg.type === 'yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    const subscriptionCode = data.subscription_code ?? data.reference ?? '';
    let emailToken = data.email_token ?? '';

    if (!emailToken && subscriptionCode) {
      const subscriptionResult = await PaystackService.getSubscription(subscriptionCode);
      if (subscriptionResult.success && subscriptionResult.data) {
        emailToken = subscriptionResult.data.email_token;
      } else {
        Logger.warn('SUBSCRIPTION_USE_CASES', `Failed to fetch email_token from Paystack: ${subscriptionResult.error}`);
      }
    }

    await SubscriptionsService.createFromPaystack({
      profile_id: userId,
      package_id: packageId,
      paystack_subscription_code: subscriptionCode,
      paystack_customer_code: data.customer.customer_code,
      paystack_email_token: emailToken,
      paystack_transaction_reference: data.reference ?? '',
      current_period_end: endDate.toISOString(),
    });
  }

  private static async renewExistingSubscription(subscriptionCode: string): Promise<void> {
    const subscription = await SubscriptionsService.getByPaystackCode(subscriptionCode);
    if (!subscription) {
      Logger.warn('SUBSCRIPTION_USE_CASES', `Subscription not found: ${subscriptionCode}`);
      return;
    }

    const currentEnd = subscription.current_period_end
      ? new Date(subscription.current_period_end)
      : new Date();
    const newEnd = new Date(currentEnd);

    if (subscription.app_packages.type === 'yearly') {
      newEnd.setFullYear(newEnd.getFullYear() + 1);
    } else {
      newEnd.setMonth(newEnd.getMonth() + 1);
    }

    await SubscriptionsService.renewSubscription(subscriptionCode, newEnd.toISOString());
  }

  public static async cancelSubscription(userId: string, subscriptionId: string): Promise<void> {
    const subscription = await SubscriptionsService.getSubscriptionById(subscriptionId);

    if (subscription.profile_id !== userId) {
      throw new HttpError(HTTP_STATUS.FORBIDDEN, 'Not authorized to cancel this subscription');
    }

    if (subscription.status === 'cancelled') {
      throw new HttpError(HTTP_STATUS.BAD_REQUEST, 'Subscription is already cancelled');
    }
    if (subscription.status === 'expired') {
      throw new HttpError(HTTP_STATUS.BAD_REQUEST, 'Subscription has expired');
    }

    if (subscription.paystack_subscription_code) {
      let emailToken = subscription.paystack_email_token;

      if (!emailToken) {
        const subscriptionResult = await PaystackService.getSubscription(subscription.paystack_subscription_code);
        if (subscriptionResult.success && subscriptionResult.data) {
          emailToken = subscriptionResult.data.email_token;
        }
      }

      if (emailToken) {
        const result = await PaystackService.disableSubscription(
          subscription.paystack_subscription_code,
          emailToken,
        );

        if (!result.success) {
          Logger.error('SUBSCRIPTION_USE_CASES', `Paystack cancellation failed: ${result.error}`);
          throw new HttpError(HTTP_STATUS.BAD_GATEWAY, 'Failed to cancel with payment provider');
        }
      } else {
        Logger.warn('SUBSCRIPTION_USE_CASES', `Cannot cancel on Paystack: missing email_token for ${subscription.paystack_subscription_code}`);
      }
    }

    await SubscriptionsService.cancelSubscription(subscriptionId);
  }

  private static readonly REFUND_WINDOW_DAYS = 7;

  public static async refundSubscription(userId: string, subscriptionId: string): Promise<void> {
    const subscription = await SubscriptionsService.getSubscriptionById(subscriptionId);

    if (subscription.profile_id !== userId) {
      throw new HttpError(HTTP_STATUS.FORBIDDEN, 'Not authorized to refund this subscription');
    }

    if (subscription.status === 'refunded') {
      throw new HttpError(HTTP_STATUS.BAD_REQUEST, 'Subscription has already been refunded');
    }
    if (subscription.status !== 'active') {
      throw new HttpError(HTTP_STATUS.BAD_REQUEST, 'Only active subscriptions can be refunded');
    }

    const createdAt = new Date(subscription.created_at);
    const now = new Date();
    const daysSinceCreation = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSinceCreation > SubscriptionUseCases.REFUND_WINDOW_DAYS) {
      throw new HttpError(
        HTTP_STATUS.BAD_REQUEST,
        `Refund period exceeded. Refunds are only available within ${SubscriptionUseCases.REFUND_WINDOW_DAYS} days of purchase.`,
      );
    }

    if (!subscription.paystack_transaction_reference) {
      throw new HttpError(HTTP_STATUS.BAD_REQUEST, 'No transaction reference found for this subscription');
    }

    if (subscription.paystack_subscription_code && subscription.paystack_email_token) {
      const cancelResult = await PaystackService.disableSubscription(
        subscription.paystack_subscription_code,
        subscription.paystack_email_token,
      );

      if (!cancelResult.success) {
        Logger.warn('SUBSCRIPTION_USE_CASES', `Failed to cancel Paystack subscription before refund: ${cancelResult.error}`);
      }
    }

    const refundResult = await PaystackService.createRefund({
      transaction: subscription.paystack_transaction_reference,
      merchant_note: `Refund requested by user within ${SubscriptionUseCases.REFUND_WINDOW_DAYS}-day window`,
    });

    if (!refundResult.success) {
      Logger.error('SUBSCRIPTION_USE_CASES', `Paystack refund failed: ${refundResult.error}`);
      throw new HttpError(HTTP_STATUS.BAD_GATEWAY, 'Failed to process refund with payment provider');
    }

    await SubscriptionsService.markRefunded(subscriptionId);
  }

  public static async changePlan(
    userId: string,
    subscriptionId: string,
    request: IChangePlanRequest,
  ): Promise<IInitializeSubscriptionResponse> {
    const currentSubscription = await SubscriptionsService.getSubscriptionById(subscriptionId);

    if (currentSubscription.profile_id !== userId) {
      throw new HttpError(HTTP_STATUS.FORBIDDEN, 'Not authorized to modify this subscription');
    }

    if (currentSubscription.status === 'expired') {
      throw new HttpError(HTTP_STATUS.BAD_REQUEST, 'Subscription has expired');
    }

    if (currentSubscription.package_id === request.new_package_id) {
      throw new HttpError(HTTP_STATUS.BAD_REQUEST, 'Already subscribed to this package');
    }

    const newPackage = await PackagesService.getPackageById(request.new_package_id);
    if (!newPackage.paystack_plan_code) {
      throw new HttpError(HTTP_STATUS.BAD_REQUEST, 'New package does not have a Paystack plan');
    }

    if (currentSubscription.paystack_subscription_code && currentSubscription.paystack_email_token) {
      const cancelResult = await PaystackService.disableSubscription(
        currentSubscription.paystack_subscription_code,
        currentSubscription.paystack_email_token,
      );

      if (!cancelResult.success) {
        Logger.warn('SUBSCRIPTION_USE_CASES', `Failed to cancel current Paystack subscription: ${cancelResult.error}`);
      }
    }

    await SubscriptionsService.cancelSubscription(subscriptionId);

    const initResult = await SubscriptionUseCases.initializeSubscription(userId, {
      package_id: request.new_package_id,
      callback_url: request.callback_url,
    });

    return initResult;
  }

  public static async getCurrentSubscription(userId: string): Promise<ISubscriptionWithPackage | null> {
    return SubscriptionsService.getUserActiveSubscription(userId);
  }
}
