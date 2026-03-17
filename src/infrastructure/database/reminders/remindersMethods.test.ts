import assert from 'node:assert/strict';
import test from 'node:test';

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

void test('buildReminderSettingUpsertData preserves existing fields on partial updates', async () => {
  setTestEnv();
  const { buildReminderSettingUpsertData } = await import('./remindersMethods.js');

  const result = buildReminderSettingUpsertData({
    userId: 'user-1',
    entityType: 'driver_licences',
    existingSetting: {
      id: 'setting-1',
      profile_id: 'user-1',
      entity_type: 'driver_licences',
      reminder_days: [30, 7],
      is_enabled: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    update: { is_enabled: false },
  });

  assert.deepEqual(result, {
    profile_id: 'user-1',
    entity_type: 'driver_licences',
    reminder_days: [30, 7],
    is_enabled: false,
  });
});

void test('buildReminderSettingUpsertData requires reminder_days when creating a new setting', async () => {
  setTestEnv();
  const { buildReminderSettingUpsertData } = await import('./remindersMethods.js');

  assert.throws(() => buildReminderSettingUpsertData({
    userId: 'user-1',
    entityType: 'firearms',
    existingSetting: null,
    update: { is_enabled: false },
  }), {
    name: 'HttpError',
    message: 'reminder_days is required when creating a new reminder setting',
  });
});

void test('RemindersValidation accepts driver_licences and five bulk settings', async () => {
  const { RemindersValidation } = await import('./validation.js');

  assert.equal(RemindersValidation.validateEntityType('driver_licences'), 'driver_licences');

  const result = RemindersValidation.validateBulkUpdate({
    settings: [
      { entity_type: 'firearms', reminder_days: [30], is_enabled: true },
      { entity_type: 'vehicles', reminder_days: [30], is_enabled: true },
      { entity_type: 'certificates', reminder_days: [30], is_enabled: true },
      { entity_type: 'psira_officers', reminder_days: [30], is_enabled: true },
      { entity_type: 'driver_licences', reminder_days: [30], is_enabled: true },
    ],
  });

  assert.equal(result.settings.length, 5);
  assert.equal(result.settings[4]?.entity_type, 'driver_licences');
});
