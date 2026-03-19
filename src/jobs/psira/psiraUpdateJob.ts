/* eslint-disable no-await-in-loop, complexity */
import type { IJobResult, IJobError } from '../types';
import { CronService } from '../cronService';
import Logger from '../../shared/utils/logger';
import { getExpiredOfficers, getApplicantDetailsBySiraNo, updateOfficerFromApi } from '../../infrastructure/database/psira/psiraMethods';
import { getPlayerIdsByProfileIds } from '../../infrastructure/database/device_tokens/deviceTokenMethods.js';
import type { IPsiraOfficer, IPsiraResult } from '../../infrastructure/database/psira/types';
import { PushService, type IPushPayload, type IPushResult } from '../../infrastructure/push/pushService.js';

const JOB_NAME = 'psira-update';
const SCHEDULE = '0 3 * * *';
const TIMEZONE = 'Africa/Johannesburg';
const DELAY_MS = 1000;
const PUSH_TITLE = 'PSIRA Record Updated';
const PUSH_ENTITY_TYPE = 'psira';

const sleep = async (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

interface IPsiraUpdateJobDependencies {
  getExpiredOfficers: ()=> Promise<IPsiraOfficer[]>;
  getPlayerIdsByProfileIds: (profileIds: string[])=> Promise<Map<string, string[]>>;
  getApplicantDetailsBySiraNo: (siraNo: string)=> Promise<IPsiraResult[]>;
  updateOfficerFromApi: (officerId: string, updates: { expiry_date: string; request_status: string })=> Promise<void>;
  sendPush: typeof PushService.send;
  sleep: (ms: number)=> Promise<void>;
}

const defaultDependencies: IPsiraUpdateJobDependencies = {
  getExpiredOfficers,
  getPlayerIdsByProfileIds,
  getApplicantDetailsBySiraNo,
  updateOfficerFromApi,
  sendPush: PushService.send.bind(PushService),
  sleep,
};

function buildResult(
  startTime: Date,
  recordsProcessed: number,
  recordsUpdated: number,
  errors: IJobError[],
): IJobResult {
  return {
    jobName: JOB_NAME,
    startTime,
    endTime: new Date(),
    success: errors.length === 0,
    recordsProcessed,
    recordsUpdated,
    errors,
  };
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

function buildUpdateNotificationPayload(officer: IPsiraOfficer, playerIds: string[]): IPushPayload {
  return {
    playerIds,
    title: PUSH_TITLE,
    body: `PSIRA record for ${officer.first_name} ${officer.last_name} was updated`,
    data: {
      entityType: PUSH_ENTITY_TYPE,
      entityId: officer.id,
      siraNo: officer.sira_no,
      firstName: officer.first_name,
      lastName: officer.last_name,
    },
  };
}

async function sendUpdateNotification(
  officer: IPsiraOfficer,
  playerIdsMap: Map<string, string[]>,
  sendPush: IPsiraUpdateJobDependencies['sendPush'],
): Promise<IPushResult | null> {
  const playerIds = playerIdsMap.get(officer.profile_id);
  if (!playerIds || playerIds.length === 0) {
    return null;
  }

  return sendPush(buildUpdateNotificationPayload(officer, playerIds));
}

export async function run(
  dependencies: IPsiraUpdateJobDependencies = defaultDependencies,
): Promise<IJobResult> {
  const startTime = new Date();
  const errors: IJobError[] = [];
  let recordsProcessed = 0;
  let recordsUpdated = 0;

  try {
    const expiredOfficers = await dependencies.getExpiredOfficers();

    if (expiredOfficers.length === 0) {
      return buildResult(startTime, 0, 0, []);
    }

    const profileIds = [...new Set(expiredOfficers.map((officer) => officer.profile_id))];
    const playerIdsMap = await dependencies.getPlayerIdsByProfileIds(profileIds);

    for (const officer of expiredOfficers) {
      recordsProcessed++;

      try {
        const apiResults = await dependencies.getApplicantDetailsBySiraNo(officer.sira_no);
        const apiResult = apiResults.at(0);
        if (!apiResult) {
          Logger.warn(JOB_NAME, `No API results for SIRA No: ${officer.sira_no}`);
          continue;
        }

        const needsUpdate = officer.expiry_date !== apiResult.ExpiryDate || officer.request_status !== apiResult.RequestStatus;

        if (needsUpdate) {
          await dependencies.updateOfficerFromApi(officer.id, {
            expiry_date: apiResult.ExpiryDate,
            request_status: apiResult.RequestStatus,
          });
          recordsUpdated++;

          const pushResult = await sendUpdateNotification(officer, playerIdsMap, dependencies.sendPush);
          if (pushResult && !pushResult.success) {
            Logger.warn(JOB_NAME, `Push notification failed for updated officer ${officer.sira_no}: ${pushResult.error ?? 'Unknown error'}`);
          }
        }
      } catch (error) {
        errors.push({ recordId: officer.id, message: getErrorMessage(error) });
        Logger.error(JOB_NAME, `Failed to update officer ${officer.sira_no}`, error);
      }

      if (recordsProcessed < expiredOfficers.length) {
        await dependencies.sleep(DELAY_MS);
      }
    }

    return buildResult(startTime, recordsProcessed, recordsUpdated, errors);
  } catch (error) {
    Logger.error(JOB_NAME, 'PSIRA update job failed', error);
    return buildResult(startTime, recordsProcessed, recordsUpdated, [{ recordId: '', message: getErrorMessage(error) }]);
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
