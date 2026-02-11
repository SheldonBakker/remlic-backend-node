/* eslint-disable no-await-in-loop */
import type { IJobResult, IJobError } from '../types.js';
import { CronService } from '../cronService.js';
import { Logger } from '../../shared/utils/logging/logger.js';
import RemindersService from '../../infrastructure/database/reminders/remindersMethods.js';
import { EmailService } from '../../infrastructure/email/emailService.js';

const JOB_NAME = 'license-reminders';
const SCHEDULE = '0 8 * * *';
const TIMEZONE = 'Africa/Johannesburg';
const BATCH_SIZE = 1000;

async function run(): Promise<IJobResult> {
  const startTime = new Date();
  const errors: IJobError[] = [];
  let recordsProcessed = 0;
  let emailsSent = 0;
  let cursor: string | undefined;

  try {
    let hasMore = true;

    while (hasMore) {
      const { items, nextCursor } = await RemindersService.getExpiringRemindersBatch(BATCH_SIZE, cursor);

      if (items.length === 0) {
        break;
      }

      const bulkItems = items.map((item) => ({
        email: item.email,
        entityType: item.entityType,
        itemName: item.itemName,
        expiryDate: item.expiryDate,
        daysUntilExpiry: item.daysUntilExpiry,
        details: item.details,
        uniqueId: `reminder-${item.entityType}-${item.entityId}-${item.daysUntilExpiry}d-${Date.now()}`,
      }));

      const result = await EmailService.createBulkEvents(bulkItems);

      recordsProcessed += items.length;

      if (result.success) {
        emailsSent += items.length;
      } else {
        errors.push({ recordId: 'batch', message: result.error ?? 'Bulk send failed' });
        Logger.error(`Failed to send batch: ${result.error}`, JOB_NAME);
      }

      hasMore = nextCursor !== null;
      cursor = nextCursor ?? undefined;
    }

    return {
      jobName: JOB_NAME,
      startTime,
      endTime: new Date(),
      success: errors.length === 0,
      recordsProcessed,
      recordsUpdated: emailsSent,
      errors,
    };
  } catch (error) {
    Logger.error('License reminder job failed', JOB_NAME, { error });
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      jobName: JOB_NAME,
      startTime,
      endTime: new Date(),
      success: false,
      recordsProcessed,
      recordsUpdated: emailsSent,
      errors: [{ recordId: '', message }],
    };
  }
}

export function registerReminderJob(): void {
  CronService.register({
    name: JOB_NAME,
    schedule: SCHEDULE,
    timezone: TIMEZONE,
    handler: async () => {
      await run();
    },
  });
}
