import type { Request, Response, NextFunction } from 'express';
import { ResponseUtil } from '../../shared/utils/response.js';
import { HTTP_STATUS } from '../../shared/constants/httpStatus.js';
import { HttpError } from '../../shared/types/errors/appError.js';
import { SubscriptionUseCases } from '../../usecases/subscriptionUseCases.js';
import { Logger } from '../../shared/utils/logging/logger.js';
import WebhooksService from '../../infrastructure/database/webhooks/webhooksMethods.js';
import { PaystackService } from '../../infrastructure/payment/paystackService.js';
import type { IPaystackWebhookPayload } from '../../infrastructure/payment/types.js';

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
      Logger.warn('Invalid Paystack webhook signature', 'WEBHOOKS_CONTROLLER');
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
          Logger.error(`Failed to process webhook event: ${errorMessage}`, 'WEBHOOKS_CONTROLLER', {
            event: payload.event,
            webhookId: webhook.id,
          });
          try {
            await WebhooksService.markFailed(webhook.id, errorMessage);
          } catch (markError) {
            Logger.error(
              `Failed to mark webhook as failed: ${markError instanceof Error ? markError.message : 'Unknown error'}`,
              'WEBHOOKS_CONTROLLER',
              { webhookId: webhook.id },
            );
          }
        }
      })();
    });
  };
}
