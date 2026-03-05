import { config } from '../config/env.config.js';
import Logger from '../../shared/utils/logger.js';

const ONESIGNAL_API_URL = 'https://onesignal.com/api/v1/notifications';
const ONESIGNAL_BATCH_LIMIT = 2000;
const CONTEXT = 'PUSH_SERVICE';

export class PushService {
  static async send(payload: IPushPayload): Promise<IPushResult> {
    const { appId, restApiKey } = config.onesignal;

    if (!appId || !restApiKey) {
      Logger.warn(CONTEXT, 'OneSignal credentials not configured, skipping push notification');
      return { success: false, error: 'OneSignal not configured' };
    }

    const playerIds = payload.playerIds.slice(0, ONESIGNAL_BATCH_LIMIT);

    try {
      const response = await fetch(ONESIGNAL_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${restApiKey}`,
        },
        body: JSON.stringify({
          app_id: appId,
          include_player_ids: playerIds,
          headings: { en: payload.title },
          contents: { en: payload.body },
          ...(payload.data ? { data: payload.data } : {}),
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        Logger.error(CONTEXT, `OneSignal API error ${response.status}: ${text}`);
        return { success: false, error: `OneSignal API error: ${response.status}` };
      }

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      Logger.error(CONTEXT, `Failed to send push notification: ${message}`, error);
      return { success: false, error: message };
    }
  }
}

export interface IPushPayload {
  playerIds: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface IPushResult {
  success: boolean;
  error?: string;
}