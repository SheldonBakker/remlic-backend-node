import type { Request, Response, NextFunction } from 'express';
import { ResponseUtil } from '../../shared/utils/response';
import { HTTP_STATUS } from '../../shared/constants/httpStatus';
import { HttpError } from '../../shared/types/errors/appError';
import { SubscriptionUseCases } from '../../useCase/subscriptionUseCases';
import Logger from '../../shared/utils/logger';
import WebhooksService from '../../infrastructure/database/webhooks/webhooksMethods';
import { PaystackService } from '../../infrastructure/payment/paystackService';
import type { IPaystackWebhookPayload } from '../../infrastructure/payment/types';

export default class WebhooksController {
  private static generateIdempotencyKey(payload: IPaystackWebhookPayload): string {
    if (payload.data.id) {
      return `paystack_${payload.data.id}`;
    }
    const reference = payload.data.reference ?? 'no_ref';
    const timestamp = payload.data.created_at;
    return `paystack_${payload.event}_${reference}_${timestamp}`;
  }

  public static handlePaystackWebhook = async (
    req: Request,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const signature = req.headers['x-paystack-signature'] as string;

    if (!signature) {
      throw new HttpError(HTTP_STATUS.BAD_REQUEST, 'Missing webhook signature');
    }

    const rawBody = JSON.stringify(req.body);

    const isValid = PaystackService.verifyWebhookSignature(rawBody, signature);

    if (!isValid) {
      Logger.warn('WEBHOOKS_CONTROLLER', 'Invalid Paystack webhook signature');
      throw new HttpError(HTTP_STATUS.UNAUTHORIZED, 'Invalid webhook signature');
    }

    const payload = req.body as IPaystackWebhookPayload;

    const idempotencyKey = WebhooksController.generateIdempotencyKey(payload);

    const { webhook, isDuplicate } = await WebhooksService.storeWebhookEvent({
      provider: 'paystack',
      event_type: payload.event,
      idempotency_key: idempotencyKey,
      payload: payload as unknown as Record<string, unknown>,
      signature,
    });

    ResponseUtil.success(res, { received: true }, HTTP_STATUS.OK);

    if (isDuplicate) {
      return;
    }

    setImmediate(() => {
      void (async (): Promise<void> => {
        try {
          await WebhooksService.markProcessing(webhook.id);
          await SubscriptionUseCases.handleWebhookEvent(payload);
          await WebhooksService.markCompleted(webhook.id);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          Logger.error('WEBHOOKS_CONTROLLER', `Failed to process webhook event: ${errorMessage} (webhookId: ${webhook.id})`, error);
          try {
            await WebhooksService.markFailed(webhook.id, errorMessage);
          } catch (markError) {
            Logger.error('WEBHOOKS_CONTROLLER', `Failed to mark webhook as failed (webhookId: ${webhook.id})`, markError);
          }
        }
      })();
    });
  };
}
