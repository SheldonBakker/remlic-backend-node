import type {
  IWebhookEvent,
  ICreateWebhookEventRequest,
  IStoreWebhookResult,
} from './types.js';
import { supabaseAdmin } from '../supabaseClient.js';
import { HttpError } from '../../../shared/types/errors/appError.js';
import { HTTP_STATUS } from '../../../shared/constants/httpStatus.js';
import { Logger } from '../../../shared/utils/logger.js';

export default class WebhooksService {
  public static async storeWebhookEvent(
    data: ICreateWebhookEventRequest,
  ): Promise<IStoreWebhookResult> {
    const { data: webhook, error } = await supabaseAdmin
      .from('webhook_events')
      .insert({
        provider: data.provider,
        event_type: data.event_type,
        idempotency_key: data.idempotency_key,
        payload: data.payload,
        signature: data.signature ?? null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        const { data: existingWebhook, error: fetchError } = await supabaseAdmin
          .from('webhook_events')
          .select('*')
          .eq('provider', data.provider)
          .eq('idempotency_key', data.idempotency_key)
          .single();

        if (fetchError || !existingWebhook) {
          Logger.error('Failed to fetch existing duplicate webhook', 'WEBHOOKS_SERVICE', {
            error: fetchError?.message,
            idempotency_key: data.idempotency_key,
          });
          throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to store webhook event');
        }

        return {
          webhook: existingWebhook as IWebhookEvent,
          isDuplicate: true,
        };
      }

      Logger.error('Failed to store webhook event', 'WEBHOOKS_SERVICE', { error: error.message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to store webhook event');
    }

    return {
      webhook: webhook as IWebhookEvent,
      isDuplicate: false,
    };
  }

  public static async markProcessing(webhookId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('webhook_events')
      .update({
        status: 'processing',
        updated_at: new Date().toISOString(),
      })
      .eq('id', webhookId);

    if (error) {
      Logger.error('Failed to mark webhook as processing', 'WEBHOOKS_SERVICE', {
        error: error.message,
        webhookId,
      });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to update webhook status');
    }
  }

  public static async markCompleted(webhookId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('webhook_events')
      .update({
        status: 'completed',
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', webhookId);

    if (error) {
      Logger.error('Failed to mark webhook as completed', 'WEBHOOKS_SERVICE', {
        error: error.message,
        webhookId,
      });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to update webhook status');
    }
  }

  public static async markFailed(webhookId: string, errorMessage: string): Promise<void> {
    const { data: current, error: fetchError } = await supabaseAdmin
      .from('webhook_events')
      .select('retry_count')
      .eq('id', webhookId)
      .single();

    if (fetchError) {
      Logger.error('Failed to fetch webhook for failure update', 'WEBHOOKS_SERVICE', {
        error: fetchError.message,
        webhookId,
      });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to update webhook status');
    }

    const newRetryCount = (current.retry_count ?? 0) + 1;

    const { error } = await supabaseAdmin
      .from('webhook_events')
      .update({
        status: 'failed',
        error_message: errorMessage,
        retry_count: newRetryCount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', webhookId);

    if (error) {
      Logger.error('Failed to mark webhook as failed', 'WEBHOOKS_SERVICE', {
        error: error.message,
        webhookId,
      });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to update webhook status');
    }

    Logger.warn(`Webhook marked as failed: ${webhookId} (retry ${newRetryCount})`, 'WEBHOOKS_SERVICE', {
      errorMessage,
    });
  }

  public static async getById(webhookId: string): Promise<IWebhookEvent | null> {
    const { data, error } = await supabaseAdmin
      .from('webhook_events')
      .select('*')
      .eq('id', webhookId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      Logger.error('Failed to fetch webhook event', 'WEBHOOKS_SERVICE', {
        error: error.message,
        webhookId,
      });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to fetch webhook event');
    }

    return data as IWebhookEvent;
  }
}
