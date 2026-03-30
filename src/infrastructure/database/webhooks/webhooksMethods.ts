import type {
  IWebhookEvent,
  ICreateWebhookEventRequest,
  IStoreWebhookResult,
} from './types';
import db from '../databaseClient';
import { webhookEvents } from '../schema/index';
import { eq, and } from 'drizzle-orm';
import { HttpError } from '../../../shared/types/errors/appError';
import { HTTP_STATUS } from '../../../shared/constants/httpStatus';
import Logger from '../../../shared/utils/logger';

const CONTEXT = 'WEBHOOKS_SERVICE';

export async function storeWebhookEvent(
  data: ICreateWebhookEventRequest,
): Promise<IStoreWebhookResult> {
  try {
    const row = await db
      .insert(webhookEvents)
      .values({
        provider: data.provider,
        event_type: data.event_type,
        idempotency_key: data.idempotency_key,
        payload: data.payload,
        signature: data.signature ?? null,
        status: 'pending',
      })
      .returning()
      .then((rows) => rows.at(0));

    if (!row) {
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to store webhook event');
    }

    return {
      webhook: {
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
        processed_at: row.processed_at !== null ? row.processed_at.toISOString() : null,
        created_at: row.created_at.toISOString(),
        updated_at: row.updated_at.toISOString(),
      },
      isDuplicate: false,
    };
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
    const cause = (error as Record<string, unknown>).cause as Record<string, unknown> | undefined;
    const code = cause !== undefined ? cause['code'] : (error as Record<string, unknown>)['code'];
    if (code === '23505') {
      const existing = await db
        .select()
        .from(webhookEvents)
        .where(
          and(
            eq(webhookEvents.provider, data.provider),
            eq(webhookEvents.idempotency_key, data.idempotency_key),
          ),
        )
        .then((rows) => rows.at(0));

      if (!existing) {
        Logger.error(CONTEXT, `Failed to fetch existing duplicate webhook (idempotency_key: ${data.idempotency_key})`);
        throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to store webhook event');
      }

      return {
        webhook: {
          id: existing.id,
          provider: existing.provider as IWebhookEvent['provider'],
          event_type: existing.event_type,
          idempotency_key: existing.idempotency_key,
          payload: existing.payload,
          signature: existing.signature,
          status: existing.status as IWebhookEvent['status'],
          error_message: existing.error_message,
          retry_count: existing.retry_count,
          max_retries: existing.max_retries,
          processed_at: existing.processed_at !== null ? existing.processed_at.toISOString() : null,
          created_at: existing.created_at.toISOString(),
          updated_at: existing.updated_at.toISOString(),
        },
        isDuplicate: true,
      };
    }

    Logger.error(CONTEXT, 'Failed to store webhook event', error);
    throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to store webhook event');
  }
}

export async function markProcessing(webhookId: string): Promise<void> {
  await db
    .update(webhookEvents)
    .set({
      status: 'processing',
      updated_at: new Date(),
    })
    .where(eq(webhookEvents.id, webhookId));
}

export async function markCompleted(webhookId: string): Promise<void> {
  await db
    .update(webhookEvents)
    .set({
      status: 'completed',
      processed_at: new Date(),
      updated_at: new Date(),
    })
    .where(eq(webhookEvents.id, webhookId));
}

export async function markFailed(webhookId: string, errorMessage: string): Promise<void> {
  const current = await db
    .select({ retry_count: webhookEvents.retry_count })
    .from(webhookEvents)
    .where(eq(webhookEvents.id, webhookId))
    .then((rows) => rows.at(0));

  if (!current) {
    Logger.error(CONTEXT, `Failed to fetch webhook for failure update (webhookId: ${webhookId})`);
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

  Logger.warn(CONTEXT, `Webhook marked as failed: ${webhookId} (retry ${newRetryCount}, error: ${errorMessage})`);
}
