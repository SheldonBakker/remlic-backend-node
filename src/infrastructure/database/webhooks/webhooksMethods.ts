import type {
  IWebhookEvent,
  ICreateWebhookEventRequest,
  IStoreWebhookResult,
} from './types.js';
import db from '../drizzleClient.js';
import { webhookEvents } from '../schema/index.js';
import { eq, and } from 'drizzle-orm';
import { HttpError } from '../../../shared/types/errors/appError.js';
import { HTTP_STATUS } from '../../../shared/constants/httpStatus.js';
import { Logger } from '../../../shared/utils/logging/logger.js';

export default class WebhooksService {
  public static async storeWebhookEvent(
    data: ICreateWebhookEventRequest,
  ): Promise<IStoreWebhookResult> {
    try {
      const [webhook] = await db
        .insert(webhookEvents)
        .values({
          provider: data.provider,
          event_type: data.event_type,
          idempotency_key: data.idempotency_key,
          payload: data.payload,
          signature: data.signature ?? null,
          status: 'pending',
        })
        .returning();

      if (!webhook) {
        throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to store webhook event');
      }

      return {
        webhook: WebhooksService.mapToWebhookEvent(webhook),
        isDuplicate: false,
      };
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      const cause = (error as Record<string, unknown>).cause as Record<string, unknown> | undefined;
      if (cause?.code === '23505' || (error as Record<string, unknown>).code === '23505') {
        const [existingWebhook] = await db
          .select()
          .from(webhookEvents)
          .where(
            and(
              eq(webhookEvents.provider, data.provider),
              eq(webhookEvents.idempotency_key, data.idempotency_key),
            ),
          );

        if (!existingWebhook) {
          Logger.error('Failed to fetch existing duplicate webhook', 'WEBHOOKS_SERVICE', {
            idempotency_key: data.idempotency_key,
          });
          throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to store webhook event');
        }

        return {
          webhook: WebhooksService.mapToWebhookEvent(existingWebhook),
          isDuplicate: true,
        };
      }

      Logger.error('Failed to store webhook event', 'WEBHOOKS_SERVICE', { error: (error as Error).message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to store webhook event');
    }
  }

  public static async markProcessing(webhookId: string): Promise<void> {
    try {
      await db
        .update(webhookEvents)
        .set({
          status: 'processing',
          updated_at: new Date(),
        })
        .where(eq(webhookEvents.id, webhookId));
    } catch (error) {
      Logger.error('Failed to mark webhook as processing', 'WEBHOOKS_SERVICE', {
        error: (error as Error).message,
        webhookId,
      });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to update webhook status');
    }
  }

  public static async markCompleted(webhookId: string): Promise<void> {
    try {
      await db
        .update(webhookEvents)
        .set({
          status: 'completed',
          processed_at: new Date(),
          updated_at: new Date(),
        })
        .where(eq(webhookEvents.id, webhookId));
    } catch (error) {
      Logger.error('Failed to mark webhook as completed', 'WEBHOOKS_SERVICE', {
        error: (error as Error).message,
        webhookId,
      });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to update webhook status');
    }
  }

  public static async markFailed(webhookId: string, errorMessage: string): Promise<void> {
    try {
      const [current] = await db
        .select({ retry_count: webhookEvents.retry_count })
        .from(webhookEvents)
        .where(eq(webhookEvents.id, webhookId));

      if (!current) {
        Logger.error('Failed to fetch webhook for failure update', 'WEBHOOKS_SERVICE', { webhookId });
        throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to update webhook status');
      }

      const newRetryCount = current.retry_count + 1;

      await db
        .update(webhookEvents)
        .set({
          status: 'failed',
          error_message: errorMessage,
          retry_count: newRetryCount,
          updated_at: new Date(),
        })
        .where(eq(webhookEvents.id, webhookId));

      Logger.warn(`Webhook marked as failed: ${webhookId} (retry ${newRetryCount})`, 'WEBHOOKS_SERVICE', {
        errorMessage,
      });
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      Logger.error('Failed to mark webhook as failed', 'WEBHOOKS_SERVICE', {
        error: (error as Error).message,
        webhookId,
      });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to update webhook status');
    }
  }

  public static async getById(webhookId: string): Promise<IWebhookEvent | null> {
    try {
      const [data] = await db
        .select()
        .from(webhookEvents)
        .where(eq(webhookEvents.id, webhookId));

      if (!data) {
        return null;
      }

      return WebhooksService.mapToWebhookEvent(data);
    } catch (error) {
      Logger.error('Failed to fetch webhook event', 'WEBHOOKS_SERVICE', {
        error: (error as Error).message,
        webhookId,
      });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to fetch webhook event');
    }
  }

  private static mapToWebhookEvent(row: typeof webhookEvents.$inferSelect): IWebhookEvent {
    return {
      id: row.id,
      provider: row.provider as IWebhookEvent['provider'],
      event_type: row.event_type,
      idempotency_key: row.idempotency_key,
      payload: row.payload,
      signature: row.signature,
      status: row.status as IWebhookEvent['status'],
      error_message: row.error_message,
      retry_count: row.retry_count,
      max_retries: row.max_retries,
      processed_at: row.processed_at?.toISOString() ?? null,
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString(),
    };
  }
}
