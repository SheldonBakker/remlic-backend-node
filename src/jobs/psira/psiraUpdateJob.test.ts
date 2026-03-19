import assert from 'node:assert/strict';
import test from 'node:test';
import type { IPsiraOfficer, IPsiraResult } from '../../infrastructure/database/psira/types.js';
import type { IPushPayload, IPushResult } from '../../infrastructure/push/pushService.js';
import type { ICronJobOptions } from '../cronService.js';

function setTestEnv(): void {
  process.env.SUPABASE_URL ??= 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'service-role-key';
  process.env.SUPABASE_JWT_SECRET ??= 'jwt-secret';
  process.env.DATABASE_URL ??= 'postgres://user:password@localhost:5432/remlic';
  process.env.RSA_V1_PK_128 ??= 'rsa-v1-128';
  process.env.RSA_V1_PK_74 ??= 'rsa-v1-74';
  process.env.RSA_V2_PK_128 ??= 'rsa-v2-128';
  process.env.RSA_V2_PK_74 ??= 'rsa-v2-74';
}

function makeOfficer(overrides: Partial<IPsiraOfficer> = {}): IPsiraOfficer {
  return {
    id: 'officer-1',
    profile_id: 'profile-1',
    id_number: '9001010000001',
    first_name: 'Jane',
    last_name: 'Doe',
    gender: 'Female',
    request_status: 'Active',
    sira_no: 'SIRA-1',
    expiry_date: '2025-01-01',
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeApiResult(overrides: Partial<IPsiraResult> = {}): IPsiraResult {
  return {
    FirstName: 'Jane',
    LastName: 'Doe',
    Gender: 'Female',
    RequestStatus: 'Active',
    SIRANo: 'SIRA-1',
    ExpiryDate: '2025-01-01',
    ...overrides,
  };
}

function makeUpdatedOfficer(overrides: Partial<IPsiraOfficer> = {}): IPsiraOfficer {
  return makeOfficer({
    expiry_date: '2025-02-02',
    ...overrides,
  });
}

function makeUpdatedApiResult(siraNo: string): IPsiraResult {
  return makeApiResult({
    SIRANo: siraNo,
    ExpiryDate: '2025-03-03',
    RequestStatus: 'Renewed',
  });
}

function asyncValue<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs)=> TResult,
): (...args: TArgs)=> Promise<TResult> {
  return async (...args: TArgs): Promise<TResult> => {
    await Promise.resolve();
    return fn(...args);
  };
}

interface IPsiraUpdateJobTestDependencies {
  getExpiredOfficers: ()=> Promise<IPsiraOfficer[]>;
  getPlayerIdsByProfileIds: (profileIds: string[])=> Promise<Map<string, string[]>>;
  getApplicantDetailsBySiraNo: (siraNo: string)=> Promise<IPsiraResult[]>;
  updateOfficerFromApi: (officerId: string, updates: { expiry_date: string; request_status: string })=> Promise<void>;
  sendPush: (payload: IPushPayload)=> Promise<IPushResult>;
  sleep: (ms: number)=> Promise<void>;
}

function createDependencies(
  overrides: Partial<IPsiraUpdateJobTestDependencies> = {},
): IPsiraUpdateJobTestDependencies {
  return {
    getExpiredOfficers: asyncValue(() => []),
    getPlayerIdsByProfileIds: asyncValue(() => new Map<string, string[]>()),
    getApplicantDetailsBySiraNo: asyncValue(() => []),
    updateOfficerFromApi: asyncValue(() => undefined),
    sendPush: asyncValue(() => ({ success: true })),
    sleep: asyncValue(() => undefined),
    ...overrides,
  };
}

void test('run returns success without downstream work when there are no expired officers', async () => {
  setTestEnv();
  const { run } = await import('./psiraUpdateJob.js');

  let playerIdsCalled = false;
  let apiCalled = false;
  let updateCalled = false;
  let pushCalled = false;

  const result = await run(createDependencies({
    getPlayerIdsByProfileIds: asyncValue(() => {
      playerIdsCalled = true;
      return new Map();
    }),
    getApplicantDetailsBySiraNo: asyncValue(() => {
      apiCalled = true;
      return [];
    }),
    updateOfficerFromApi: asyncValue(() => {
      updateCalled = true;
    }),
    sendPush: asyncValue(() => {
      pushCalled = true;
      return { success: true };
    }),
  }));

  assert.equal(result.success, true);
  assert.equal(result.recordsProcessed, 0);
  assert.equal(result.recordsUpdated, 0);
  assert.deepEqual(result.errors, []);
  assert.equal(playerIdsCalled, false);
  assert.equal(apiCalled, false);
  assert.equal(updateCalled, false);
  assert.equal(pushCalled, false);
});

void test('run sends a push for each updated PSIRA record with player ids', async () => {
  setTestEnv();
  const { run } = await import('./psiraUpdateJob.js');

  const expiredOfficers = [
    makeOfficer({ id: 'officer-1', profile_id: 'profile-1', sira_no: 'SIRA-1' }),
    makeUpdatedOfficer({ id: 'officer-2', profile_id: 'profile-2', sira_no: 'SIRA-2' }),
    makeOfficer({ id: 'officer-3', profile_id: 'profile-3', sira_no: 'SIRA-3' }),
  ];
  const playerIdsLookups: string[][] = [];
  const apiCalls: string[] = [];
  const updates: Array<{ officerId: string; updates: { expiry_date: string; request_status: string } }> = [];
  const pushPayloads: IPushPayload[] = [];
  const sleepCalls: Array<{ ms: number; afterApiCall: string | undefined }> = [];

  const result = await run(createDependencies({
    getExpiredOfficers: asyncValue(() => expiredOfficers),
    getPlayerIdsByProfileIds: asyncValue((profileIds) => {
      playerIdsLookups.push(profileIds);
      return new Map([
        ['profile-2', ['player-1', 'player-2']],
      ]);
    }),
    getApplicantDetailsBySiraNo: asyncValue((siraNo) => {
      apiCalls.push(siraNo);
      if (siraNo === 'SIRA-2') {
        return [makeUpdatedApiResult(siraNo)];
      }
      return [makeApiResult({ SIRANo: siraNo })];
    }),
    updateOfficerFromApi: asyncValue((officerId, officerUpdates) => {
      updates.push({ officerId, updates: officerUpdates });
    }),
    sendPush: asyncValue((payload) => {
      pushPayloads.push(payload);
      return { success: true };
    }),
    sleep: asyncValue((ms) => {
      sleepCalls.push({ ms, afterApiCall: apiCalls.at(-1) });
    }),
  }));

  assert.deepEqual(playerIdsLookups, [['profile-1', 'profile-2', 'profile-3']]);
  assert.deepEqual(apiCalls, ['SIRA-1', 'SIRA-2', 'SIRA-3']);
  assert.deepEqual(updates, [{
    officerId: 'officer-2',
    updates: {
      expiry_date: '2025-03-03',
      request_status: 'Renewed',
    },
  }]);
  assert.deepEqual(pushPayloads, [{
    playerIds: ['player-1', 'player-2'],
    title: 'PSIRA Record Updated',
    body: 'PSIRA record for Jane Doe was updated',
    data: {
      entityType: 'psira',
      entityId: 'officer-2',
      siraNo: 'SIRA-2',
      firstName: 'Jane',
      lastName: 'Doe',
    },
  }]);
  assert.deepEqual(sleepCalls, [
    { ms: 1000, afterApiCall: 'SIRA-1' },
    { ms: 1000, afterApiCall: 'SIRA-2' },
  ]);
  assert.equal(result.success, true);
  assert.equal(result.recordsProcessed, 3);
  assert.equal(result.recordsUpdated, 1);
  assert.deepEqual(result.errors, []);
});

void test('run skips push when an updated officer has no player ids', async () => {
  setTestEnv();
  const { run } = await import('./psiraUpdateJob.js');

  let pushCalled = false;

  const result = await run(createDependencies({
    getExpiredOfficers: asyncValue(() => [
      makeUpdatedOfficer({ id: 'officer-1', profile_id: 'profile-1', sira_no: 'SIRA-1' }),
    ]),
    getApplicantDetailsBySiraNo: asyncValue((siraNo) => [makeUpdatedApiResult(siraNo)]),
    sendPush: asyncValue(() => {
      pushCalled = true;
      return { success: true };
    }),
  }));

  assert.equal(pushCalled, false);
  assert.equal(result.success, true);
  assert.equal(result.recordsProcessed, 1);
  assert.equal(result.recordsUpdated, 1);
  assert.deepEqual(result.errors, []);
});

void test('run skips update and push when the PSIRA API returns no results', async () => {
  setTestEnv();
  const { run } = await import('./psiraUpdateJob.js');

  let updateCalled = false;
  let pushCalled = false;

  const result = await run(createDependencies({
    getExpiredOfficers: asyncValue(() => [makeOfficer()]),
    updateOfficerFromApi: asyncValue(() => {
      updateCalled = true;
    }),
    sendPush: asyncValue(() => {
      pushCalled = true;
      return { success: true };
    }),
  }));

  assert.equal(updateCalled, false);
  assert.equal(pushCalled, false);
  assert.equal(result.success, true);
  assert.equal(result.recordsProcessed, 1);
  assert.equal(result.recordsUpdated, 0);
  assert.deepEqual(result.errors, []);
});

void test('run keeps success true when push send fails after a successful DB update', async () => {
  setTestEnv();
  const { run } = await import('./psiraUpdateJob.js');

  const updates: Array<{ officerId: string; updates: { expiry_date: string; request_status: string } }> = [];
  const pushPayloads: IPushPayload[] = [];

  const result = await run(createDependencies({
    getExpiredOfficers: asyncValue(() => [
      makeUpdatedOfficer({ id: 'officer-1', profile_id: 'profile-1', sira_no: 'SIRA-1' }),
      makeUpdatedOfficer({ id: 'officer-2', profile_id: 'profile-2', sira_no: 'SIRA-2' }),
    ]),
    getPlayerIdsByProfileIds: asyncValue(() => new Map([
      ['profile-1', ['player-1']],
      ['profile-2', ['player-2']],
    ])),
    getApplicantDetailsBySiraNo: asyncValue((siraNo) => [makeUpdatedApiResult(siraNo)]),
    updateOfficerFromApi: asyncValue((officerId, officerUpdates) => {
      updates.push({ officerId, updates: officerUpdates });
    }),
    sendPush: asyncValue((payload) => {
      pushPayloads.push(payload);
      if (payload.playerIds[0] === 'player-1') {
        return { success: false, error: 'Push failed' };
      }
      return { success: true };
    }),
  }));

  assert.equal(pushPayloads.length, 2);
  assert.equal(updates.length, 2);
  assert.equal(result.success, true);
  assert.equal(result.recordsProcessed, 2);
  assert.equal(result.recordsUpdated, 2);
  assert.deepEqual(result.errors, []);
});

void test('run records lookup failures and still updates and notifies later officers', async () => {
  setTestEnv();
  const { run } = await import('./psiraUpdateJob.js');

  const updates: Array<{ officerId: string; updates: { expiry_date: string; request_status: string } }> = [];
  const pushPayloads: IPushPayload[] = [];
  const sleepCalls: number[] = [];

  const result = await run(createDependencies({
    getExpiredOfficers: asyncValue(() => [
      makeOfficer({ id: 'officer-1', profile_id: 'profile-1', sira_no: 'SIRA-1' }),
      makeUpdatedOfficer({ id: 'officer-2', profile_id: 'profile-2', sira_no: 'SIRA-2' }),
    ]),
    getPlayerIdsByProfileIds: asyncValue(() => new Map([
      ['profile-2', ['player-2']],
    ])),
    getApplicantDetailsBySiraNo: asyncValue((siraNo) => {
      if (siraNo === 'SIRA-1') {
        throw new Error('PSIRA lookup failed');
      }
      return [makeApiResult({ SIRANo: siraNo, ExpiryDate: '2025-06-06', RequestStatus: 'Renewed' })];
    }),
    updateOfficerFromApi: asyncValue((officerId, officerUpdates) => {
      updates.push({ officerId, updates: officerUpdates });
    }),
    sendPush: asyncValue((payload) => {
      pushPayloads.push(payload);
      return { success: true };
    }),
    sleep: asyncValue((ms) => {
      sleepCalls.push(ms);
    }),
  }));

  assert.deepEqual(updates, [{
    officerId: 'officer-2',
    updates: {
      expiry_date: '2025-06-06',
      request_status: 'Renewed',
    },
  }]);
  assert.equal(pushPayloads.length, 1);
  assert.deepEqual(sleepCalls, [1000]);
  assert.equal(result.success, false);
  assert.equal(result.recordsProcessed, 2);
  assert.equal(result.recordsUpdated, 1);
  assert.deepEqual(result.errors, [{
    recordId: 'officer-1',
    message: 'PSIRA lookup failed',
  }]);
});

void test('registerPsiraUpdateJob registers the expected cron contract', async () => {
  setTestEnv();
  const { CronService } = await import('../cronService.js');
  const { registerPsiraUpdateJob } = await import('./psiraUpdateJob.js');

  const originalRegisterDescriptor = Object.getOwnPropertyDescriptor(CronService, 'register');
  const registeredJobs: ICronJobOptions[] = [];

  Object.defineProperty(CronService, 'register', {
    configurable: true,
    value: (options: ICronJobOptions): void => {
      registeredJobs.push(options);
    },
  });

  try {
    registerPsiraUpdateJob();
  } finally {
    if (originalRegisterDescriptor) {
      Object.defineProperty(CronService, 'register', originalRegisterDescriptor);
    }
  }

  assert.equal(registeredJobs.length, 1);

  const registeredJob = registeredJobs[0];

  assert.equal(registeredJob.name, 'psira-update');
  assert.equal(registeredJob.schedule, '0 3 * * *');
  assert.equal(registeredJob.timezone, 'Africa/Johannesburg');
  assert.equal(typeof registeredJob.handler, 'function');
});
