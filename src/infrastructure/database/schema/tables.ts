import { pgTable, uuid, text, boolean, timestamp, integer, date, jsonb, pgView, uniqueIndex } from 'drizzle-orm/pg-core';

export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(),
  email: text('email'),
  phone: text('phone'),
  role: text('role').notNull().default('User'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const firearms = pgTable('firearms', {
  id: uuid('id').primaryKey().defaultRandom(),
  profile_id: uuid('profile_id').notNull().references(() => profiles.id),
  type: text('type').notNull(),
  make: text('make').notNull(),
  model: text('model').notNull(),
  caliber: text('caliber').notNull(),
  serial_number: text('serial_number'),
  expiry_date: date('expiry_date').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const vehicles = pgTable('vehicles', {
  id: uuid('id').primaryKey().defaultRandom(),
  profile_id: uuid('profile_id').notNull().references(() => profiles.id),
  make: text('make').notNull(),
  model: text('model').notNull(),
  year: integer('year').notNull(),
  vin_number: text('vin_number'),
  registration_number: text('registration_number').notNull(),
  expiry_date: date('expiry_date').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const certificates = pgTable('certificates', {
  id: uuid('id').primaryKey().defaultRandom(),
  profile_id: uuid('profile_id').notNull().references(() => profiles.id),
  type: text('type').notNull(),
  first_name: text('first_name').notNull(),
  last_name: text('last_name').notNull(),
  certificate_number: text('certificate_number').notNull(),
  expiry_date: date('expiry_date').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const psiraOfficers = pgTable('psira_officers', {
  id: uuid('id').primaryKey().defaultRandom(),
  profile_id: uuid('profile_id').notNull().references(() => profiles.id),
  id_number: text('id_number').notNull(),
  first_name: text('first_name').notNull(),
  last_name: text('last_name').notNull(),
  gender: text('gender'),
  request_status: text('request_status'),
  sira_no: text('sira_no'),
  expiry_date: date('expiry_date').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const driverLicences = pgTable('driver_licences', {
  id: uuid('id').primaryKey().defaultRandom(),
  profile_id: uuid('profile_id').notNull().references(() => profiles.id),
  surname: text('surname').notNull(),
  initials: text('initials').notNull(),
  id_number: text('id_number').notNull(),
  expiry_date: date('expiry_date').notNull(),
  licence_number: text('licence_number'),
  licence_codes: text('licence_codes').array(),
  issue_date: date('issue_date'),
  date_of_birth: date('date_of_birth'),
  gender: text('gender'),
  decoded_data: jsonb('decoded_data').$type<Record<string, unknown>>(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const appPermissions = pgTable('app_permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  permission_name: text('permission_name').notNull(),
  psira_access: boolean('psira_access').notNull().default(false),
  firearm_access: boolean('firearm_access').notNull().default(false),
  vehicle_access: boolean('vehicle_access').notNull().default(false),
  certificate_access: boolean('certificate_access').notNull().default(false),
  drivers_access: boolean('drivers_access').notNull().default(false),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const appPackages = pgTable('app_packages', {
  id: uuid('id').primaryKey().defaultRandom(),
  package_name: text('package_name').notNull(),
  slug: text('slug').notNull().unique(),
  type: text('type').notNull(),
  permission_id: uuid('permission_id').notNull().references(() => appPermissions.id),
  description: text('description'),
  is_active: boolean('is_active').notNull().default(true),
  paystack_plan_code: text('paystack_plan_code'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const appSubscriptions = pgTable('app_subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  profile_id: uuid('profile_id').notNull().references(() => profiles.id),
  package_id: uuid('package_id').notNull().references(() => appPackages.id),
  start_date: date('start_date').notNull(),
  end_date: date('end_date').notNull(),
  status: text('status').notNull().default('active'),
  paystack_subscription_code: text('paystack_subscription_code'),
  paystack_customer_code: text('paystack_customer_code'),
  paystack_email_token: text('paystack_email_token'),
  paystack_transaction_reference: text('paystack_transaction_reference'),
  current_period_end: timestamp('current_period_end', { withTimezone: true }),
  refunded_at: timestamp('refunded_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const reminderSettings = pgTable('reminder_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  profile_id: uuid('profile_id').notNull().references(() => profiles.id),
  entity_type: text('entity_type').notNull(),
  reminder_days: integer('reminder_days').array().notNull(),
  is_enabled: boolean('is_enabled').notNull().default(true),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('reminder_settings_profile_entity_unique').on(table.profile_id, table.entity_type),
]);

export const webhookEvents = pgTable('webhook_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  provider: text('provider').notNull(),
  event_type: text('event_type').notNull(),
  idempotency_key: text('idempotency_key').notNull(),
  payload: jsonb('payload').notNull().$type<Record<string, unknown>>(),
  signature: text('signature'),
  status: text('status').notNull().default('pending'),
  error_message: text('error_message'),
  retry_count: integer('retry_count').notNull().default(0),
  max_retries: integer('max_retries').notNull().default(3),
  processed_at: timestamp('processed_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('webhook_events_provider_idempotency_unique').on(table.provider, table.idempotency_key),
]);

export const dashboardExpiringRecords = pgView('dashboard_expiring_records').as((qb) => {
  return qb.select({
    id: profiles.id,
    profile_id: profiles.id,
    record_type: profiles.role,
    name: profiles.email,
    identifier: profiles.email,
    expiry_date: profiles.created_at,
    created_at: profiles.created_at,
  }).from(profiles).limit(0);
});
