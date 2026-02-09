/* eslint-disable no-await-in-loop, complexity */
import type { IJobResult, IJobError } from '../types.js';
import { CronService } from '../cronService.js';
import { Logger } from '../../shared/utils/logger.js';
import PsiraService from '../../infrastructure/database/psira/psiraMethods.js';
import SubscriptionsService from '../../infrastructure/database/subscriptions/subscriptionsMethods.js';

const JOB_NAME = 'psira-update';
const SCHEDULE = '0 3 * * *';
const TIMEZONE = 'Africa/Johannesburg';
const DELAY_MS = 1000;

const sleep = async (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

async function run(): Promise<IJobResult> {
  const startTime = new Date();
  const errors: IJobError[] = [];
  let recordsProcessed = 0;
  let recordsUpdated = 0;

  try {
    const expiredOfficers = await PsiraService.getExpiredOfficers();

    if (expiredOfficers.length === 0) {
      return { jobName: JOB_NAME, startTime, endTime: new Date(), success: true, recordsProcessed: 0, recordsUpdated: 0, errors: [] };
    }

    const profileIds = [...new Set(expiredOfficers.map((o) => o.profile_id))];
    const validProfileIds = await SubscriptionsService.getProfileIdsWithValidSubscription(profileIds);
    const eligibleOfficers = expiredOfficers.filter((o) => validProfileIds.has(o.profile_id));

    if (eligibleOfficers.length === 0) {
      return { jobName: JOB_NAME, startTime, endTime: new Date(), success: true, recordsProcessed: 0, recordsUpdated: 0, errors: [] };
    }

    for (const officer of eligibleOfficers) {
      recordsProcessed++;

      try {
        const apiResults = await PsiraService.getApplicantDetailsBySiraNo(officer.sira_no);

        if (apiResults.length === 0 || !apiResults[0]) {
          Logger.warn(`No API results for SIRA No: ${officer.sira_no}`, JOB_NAME);
          continue;
        }

        const apiResult = apiResults[0];
        const needsUpdate = officer.expiry_date !== apiResult.ExpiryDate || officer.request_status !== apiResult.RequestStatus;

        if (needsUpdate) {
          await PsiraService.updateOfficerFromApi(officer.id, {
            expiry_date: apiResult.ExpiryDate,
            request_status: apiResult.RequestStatus,
          });
          recordsUpdated++;
        }
      } catch (error) {
        errors.push({ recordId: officer.id, message: error instanceof Error ? error.message : 'Unknown error' });
        Logger.error(`Failed to update officer ${officer.sira_no}`, JOB_NAME, { error });
      }

      if (recordsProcessed < eligibleOfficers.length) {
        await sleep(DELAY_MS);
      }
    }

    return { jobName: JOB_NAME, startTime, endTime: new Date(), success: errors.length === 0, recordsProcessed, recordsUpdated, errors };
  } catch (error) {
    Logger.error('PSIRA update job failed', JOB_NAME, { error });
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      jobName: JOB_NAME, startTime, endTime: new Date(), success: false,
      recordsProcessed, recordsUpdated, errors: [{ recordId: '', message }],
    };
  }
}

export function registerPsiraUpdateJob(): void {
  CronService.register({
    name: JOB_NAME,
    schedule: SCHEDULE,
    timezone: TIMEZONE,
    handler: async () => {
      await run();
    },
  });
}
