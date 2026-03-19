/* eslint-disable no-await-in-loop */
import type { IJobResult, IJobError } from '../types.js';
import { CronService } from '../cronService.js';
import Logger from '../../shared/utils/logger.js';
import { getExpiringRemindersBatch } from '../../infrastructure/database/reminders/remindersMethods.js';
import { getPlayerIdsByProfileIds } from '../../infrastructure/database/device_tokens/deviceTokenMethods.js';
import { getProfileIdsWithActiveSubscription } from '../../infrastructure/database/subscriptions/subscriptionsMethods.js';
import { PushService } from '../../infrastructure/push/pushService.js';
import type { IBatchReminderItem, IBatchReminderResult } from '../../infrastructure/database/reminders/types.js';

const JOB_NAME = 'push-reminders';
const SCHEDULE = '0 8 * * *';
const TIMEZONE = 'Africa/Johannesburg';
const BATCH_SIZE = 1000;

interface IPushReminderJobDependencies {
  getExpiringRemindersBatch: (limit?: number, cursorId?: string | null)=> Promise<IBatchReminderResult>;
  getPlayerIdsByProfileIds: (profileIds: string[])=> Promise<Map<string, string[]>>;
  getProfileIdsWithActiveSubscription: (profileIds: string[])=> Promise<Set<string>>;
  sendPush: typeof PushService.send;
}

const defaultDependencies: IPushReminderJobDependencies = {
  getExpiringRemindersBatch,
  getPlayerIdsByProfileIds,
  getProfileIdsWithActiveSubscription,
  sendPush: PushService.send.bind(PushService),
};

async function sendReminderPush(
  item: IBatchReminderItem,
  playerIdsMap: Map<string, string[]>,
  sendPush: IPushReminderJobDependencies['sendPush'],
): Promise<IJobError | null> {
  const playerIds = playerIdsMap.get(item.profileId);
  if (!playerIds || playerIds.length === 0) {
    return null;
  }

  const result = await sendPush({
    playerIds,
    title: 'Expiry Reminder',
    body: `${item.itemName} expires in ${item.daysUntilExpiry} day(s)`,
    data: {
      entityType: item.entityType,
      entityId: item.entityId,
      expiryDate: item.expiryDate,
    },
  });

  if (result.success) {
    return null;
  }

  return { recordId: item.entityId, message: result.error ?? 'Push send failed' };
}

async function processBatch(
  items: IBatchReminderItem[],
  dependencies: IPushReminderJobDependencies,
): Promise<Pick<IJobResult, 'recordsProcessed' | 'recordsUpdated' | 'errors'>> {
  const profileIds = [...new Set(items.map((item) => item.profileId))];
  const playerIdsMap = await dependencies.getPlayerIdsByProfileIds(profileIds);
  const validProfileIds = await dependencies.getProfileIdsWithActiveSubscription(profileIds);

  const profilesWithTokens = profileIds.filter((id) => {
    const ids = playerIdsMap.get(id);
    return ids !== undefined && ids.length > 0;
  }).length;

  Logger.info(JOB_NAME, `Batch: ${items.length} items, ${profileIds.length} unique profiles, ${profilesWithTokens} with device tokens, ${validProfileIds.size} with active subscriptions`);

  const errors: IJobError[] = [];
  let pushSent = 0;
  let skipped = 0;

  for (const item of items) {
    if (!validProfileIds.has(item.profileId)) {
      skipped++;
      continue;
    }

    const playerIds = playerIdsMap.get(item.profileId);
    if (!playerIds || playerIds.length === 0) {
      skipped++;
      continue;
    }

    const error = await sendReminderPush(item, playerIdsMap, dependencies.sendPush);
    if (!error) {
      pushSent++;
      continue;
    }

    errors.push(error);
    Logger.error(JOB_NAME, `Failed to send push for ${item.entityId}: ${error.message}`);
  }

  Logger.info(JOB_NAME, `Batch result: ${pushSent} sent, ${skipped} skipped, ${errors.length} errors`);

  return {
    recordsProcessed: items.length,
    recordsUpdated: pushSent,
    errors,
  };
}

export async function run(
  dependencies: IPushReminderJobDependencies = defaultDependencies,
): Promise<IJobResult> {
  const startTime = new Date();
  const errors: IJobError[] = [];
  let recordsProcessed = 0;
  let pushSent = 0;
  let cursor: string | null = null;

  try {
    let hasMore = true;

    while (hasMore) {
      const { items, nextCursor } = await dependencies.getExpiringRemindersBatch(BATCH_SIZE, cursor);

      if (items.length === 0) {
        Logger.info(JOB_NAME, 'No expiring reminders found');
        break;
      }

      const batchResult = await processBatch(items, dependencies);
      recordsProcessed += batchResult.recordsProcessed;
      pushSent += batchResult.recordsUpdated;
      errors.push(...batchResult.errors);

      hasMore = nextCursor !== null;
      cursor = nextCursor;
    }

    return {
      jobName: JOB_NAME,
      startTime,
      endTime: new Date(),
      success: errors.length === 0,
      recordsProcessed,
      recordsUpdated: pushSent,
      errors,
    };
  } catch (error) {
    Logger.error(JOB_NAME, 'Push reminder job failed', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      jobName: JOB_NAME,
      startTime,
      endTime: new Date(),
      success: false,
      recordsProcessed,
      recordsUpdated: pushSent,
      errors: [{ recordId: '', message }],
    };
  }
}

export function registerPushReminderJob(): void {
  CronService.register({
    name: JOB_NAME,
    schedule: SCHEDULE,
    timezone: TIMEZONE,
    runImmediately: true,
    handler: async () => {
      const result = await run();
      Logger.info(JOB_NAME, `Job completed: ${result.recordsProcessed} processed, ${result.recordsUpdated} sent, ${result.errors.length} errors, success=${result.success}`);
      if (result.errors.length > 0) {
        Logger.error(JOB_NAME, `Errors: ${JSON.stringify(result.errors)}`);
      }
    },
  });
}
