import assert from 'node:assert/strict';
import test from 'node:test';
import type { IBatchReminderResult } from '../../infrastructure/database/reminders/types.js';

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

void test('run sends pushes only to profiles with active subscriptions and player ids', async () => {
  setTestEnv();
  const { run } = await import('./pushReminderJob.js');

  const batch: IBatchReminderResult = {
    items: [
      {
        id: 'batch-1',
        profileId: 'profile-active',
        email: 'active@example.com',
        entityType: 'driver_licences',
        entityId: 'entity-1',
        itemName: 'AB Example',
        expiryDate: '2026-04-16',
        daysUntilExpiry: 30,
        details: {},
      },
      {
        id: 'batch-2',
        profileId: 'profile-cancelled',
        email: 'cancelled@example.com',
        entityType: 'firearms',
        entityId: 'entity-2',
        itemName: 'Model 1',
        expiryDate: '2026-04-16',
        daysUntilExpiry: 30,
        details: {},
      },
      {
        id: 'batch-3',
        profileId: 'profile-no-token',
        email: 'tokenless@example.com',
        entityType: 'vehicles',
        entityId: 'entity-3',
        itemName: 'Car 1',
        expiryDate: '2026-04-16',
        daysUntilExpiry: 30,
        details: {},
      },
    ],
    nextCursor: null,
  };

  const sentPayloads: unknown[] = [];
  const result = await run({
    getExpiringRemindersBatch: async () => {
      await Promise.resolve();
      return batch;
    },
    getPlayerIdsByProfileIds: async () => {
      await Promise.resolve();
      return new Map([
        ['profile-active', ['player-1']],
        ['profile-cancelled', ['player-2']],
      ]);
    },
    getProfileIdsWithActiveSubscription: async () => {
      await Promise.resolve();
      return new Set(['profile-active']);
    },
    sendPush: async (payload) => {
      await Promise.resolve();
      sentPayloads.push(payload);
      return { success: true };
    },
  });

  assert.equal(sentPayloads.length, 1);
  assert.equal(result.recordsProcessed, 3);
  assert.equal(result.recordsUpdated, 1);
  assert.equal(result.success, true);
  assert.deepEqual(sentPayloads[0], {
    playerIds: ['player-1'],
    title: 'Expiry Reminder',
    body: 'AB Example expires in 30 day(s)',
    data: {
      entityType: 'driver_licences',
      entityId: 'entity-1',
      expiryDate: '2026-04-16',
    },
  });
});

void test('run sends a push on the expiry date', async () => {
  setTestEnv();
  const { run } = await import('./pushReminderJob.js');

  const batch: IBatchReminderResult = {
    items: [
      {
        id: 'batch-expiry-day',
        profileId: 'profile-active',
        email: 'active@example.com',
        entityType: 'vehicles',
        entityId: 'entity-expiry-day',
        itemName: 'Car 1',
        expiryDate: '2026-04-16',
        daysUntilExpiry: 0,
        details: {},
      },
    ],
    nextCursor: null,
  };

  const sentPayloads: unknown[] = [];
  const result = await run({
    getExpiringRemindersBatch: async () => {
      await Promise.resolve();
      return batch;
    },
    getPlayerIdsByProfileIds: async () => {
      await Promise.resolve();
      return new Map([
        ['profile-active', ['player-1']],
      ]);
    },
    getProfileIdsWithActiveSubscription: async () => {
      await Promise.resolve();
      return new Set(['profile-active']);
    },
    sendPush: async (payload) => {
      await Promise.resolve();
      sentPayloads.push(payload);
      return { success: true };
    },
  });

  assert.equal(sentPayloads.length, 1);
  assert.equal(result.recordsProcessed, 1);
  assert.equal(result.recordsUpdated, 1);
  assert.equal(result.success, true);
  assert.deepEqual(sentPayloads[0], {
    playerIds: ['player-1'],
    title: 'Expiry Reminder',
    body: 'Car 1 expires in 0 day(s)',
    data: {
      entityType: 'vehicles',
      entityId: 'entity-expiry-day',
      expiryDate: '2026-04-16',
    },
  });
});
