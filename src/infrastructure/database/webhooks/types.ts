export type WebhookProvider = 'paystack';
export type WebhookStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface IWebhookEvent {
  id: string;
  provider: WebhookProvider;
  event_type: string;
  idempotency_key: string;
  payload: Record<string, unknown>;
  signature: string | null;
  status: WebhookStatus;
  error_message: string | null;
  retry_count: number;
  max_retries: number;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ICreateWebhookEventRequest {
  provider: WebhookProvider;
  event_type: string;
  idempotency_key: string;
  payload: Record<string, unknown>;
  signature?: string;
}

export interface IStoreWebhookResult {
  webhook: IWebhookEvent;
  isDuplicate: boolean;
}
