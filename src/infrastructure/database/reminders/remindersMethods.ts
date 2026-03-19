import type {
  IReminderSetting,
  IReminderSettingsResponse,
  IUpsertReminderSettingData,
  IUpdateReminderSettingRequest,
  EntityType,
  IExpiringItem,
  IBatchReminderItem,
  IBatchReminderResult,
} from './types';
import db from '../databaseClient';
import { reminderSettings, firearms, vehicles, certificates, psiraOfficers, driverLicences } from '../schema/index';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { HttpError } from '../../../shared/types/errors/appError';
import { HTTP_STATUS } from '../../../shared/constants/httpStatus';
import Logger from '../../../shared/utils/logger';
import { ENTITY_TYPES } from '../../../shared/constants/entities';

const CONTEXT = 'REMINDERS_SERVICE';

type EntityTable = typeof firearms | typeof vehicles | typeof certificates | typeof psiraOfficers | typeof driverLicences;

const ENTITY_DRIZZLE_TABLE_MAP: Record<EntityType, EntityTable> = {
  firearms,
  vehicles,
  certificates,
  psira_officers: psiraOfficers,
  driver_licences: driverLicences,
};

function createEmptyReminderSettingsResponse(): IReminderSettingsResponse {
  return Object.fromEntries(ENTITY_TYPES.map((entityType) => [entityType, null])) as unknown as IReminderSettingsResponse;
}

async function saveSetting(data: IUpsertReminderSettingData): Promise<IReminderSetting> {
  const setting = await db
    .insert(reminderSettings)
    .values({
      profile_id: data.profile_id,
      entity_type: data.entity_type,
      reminder_days: data.reminder_days,
      is_enabled: data.is_enabled,
    })
    .onConflictDoUpdate({
      target: [reminderSettings.profile_id, reminderSettings.entity_type],
      set: {
        reminder_days: data.reminder_days,
        is_enabled: data.is_enabled,
        updated_at: new Date(),
      },
    })
    .returning()
    .then((rows) => rows.at(0));

  if (!setting) {
    throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to update reminder setting');
  }

  return mapToSetting(setting);
}

export async function getAllSettings(userId: string): Promise<IReminderSettingsResponse> {
  const data = await db
    .select()
    .from(reminderSettings)
    .where(eq(reminderSettings.profile_id, userId));

  const response = createEmptyReminderSettingsResponse();

  for (const row of data) {
    const setting = mapToSetting(row);
    response[setting.entity_type] = setting;
  }

  return response;
}

async function getSetting(userId: string, entityType: EntityType): Promise<IReminderSetting | null> {
  const setting = await db
    .select()
    .from(reminderSettings)
    .where(and(
      eq(reminderSettings.profile_id, userId),
      eq(reminderSettings.entity_type, entityType),
    ))
    .limit(1)
    .then((rows) => rows.at(0));

  return setting ? mapToSetting(setting) : null;
}

export function buildReminderSettingUpsertData(params: {
  userId: string;
  entityType: EntityType;
  existingSetting: IReminderSetting | null;
  update: IUpdateReminderSettingRequest;
}): IUpsertReminderSettingData {
  const { userId, entityType, existingSetting, update } = params;

  if (!existingSetting && !update.reminder_days) {
    throw new HttpError(HTTP_STATUS.BAD_REQUEST, 'reminder_days is required when creating a new reminder setting');
  }

  return {
    profile_id: userId,
    entity_type: entityType,
    reminder_days: update.reminder_days ?? existingSetting?.reminder_days ?? [],
    is_enabled: update.is_enabled ?? existingSetting?.is_enabled ?? true,
  };
}

export async function upsertSetting(
  userId: string,
  entityType: EntityType,
  update: IUpdateReminderSettingRequest,
): Promise<IReminderSetting> {
  const existingSetting = await getSetting(userId, entityType);
  return saveSetting(buildReminderSettingUpsertData({
    userId,
    entityType,
    existingSetting,
    update,
  }));
}

export async function bulkUpsertSettings(
  userId: string,
  settings: Array<{ entity_type: EntityType; reminder_days: number[]; is_enabled: boolean }>,
): Promise<IReminderSettingsResponse> {
  await Promise.all(settings.map(async (setting) => saveSetting({
    profile_id: userId,
    entity_type: setting.entity_type,
    reminder_days: setting.reminder_days,
    is_enabled: setting.is_enabled,
  })));

  return getAllSettings(userId);
}

export async function deleteSetting(userId: string, entityType: EntityType): Promise<void> {
  const existing = await db
    .select({ id: reminderSettings.id })
    .from(reminderSettings)
    .where(and(eq(reminderSettings.profile_id, userId), eq(reminderSettings.entity_type, entityType)))
    .then((rows) => rows.at(0));

  if (!existing) {
    Logger.warn(CONTEXT, `Reminder setting not found for deletion (entityType: ${entityType})`);
    throw new HttpError(HTTP_STATUS.NOT_FOUND, 'Reminder setting not found');
  }

  await db
    .delete(reminderSettings)
    .where(and(eq(reminderSettings.profile_id, userId), eq(reminderSettings.entity_type, entityType)));
}

export async function getAllEnabledSettings(): Promise<IReminderSetting[]> {
  const data = await db
    .select()
    .from(reminderSettings)
    .where(eq(reminderSettings.is_enabled, true));

  return data.map((row) => mapToSetting(row));
}

export function getReminderWindowStartDays(reminderDays: number[]): number {
  return Math.max(...reminderDays);
}

export function isWithinDailyReminderWindow(daysUntilExpiry: number, reminderDays: number[]): boolean {
  if (reminderDays.length === 0) {
    return false;
  }

  const reminderWindowStartDays = getReminderWindowStartDays(reminderDays);
  return daysUntilExpiry >= 0 && daysUntilExpiry <= reminderWindowStartDays;
}

export async function getExpiringItems(
  entityType: EntityType,
  profileId: string,
  reminderDays: number[],
): Promise<IExpiringItem[]> {
  try {
    if (reminderDays.length === 0) {
      return [];
    }

    const table = ENTITY_DRIZZLE_TABLE_MAP[entityType];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const reminderWindowStartDays = getReminderWindowStartDays(reminderDays);
    const lastReminderDate = new Date(today);
    lastReminderDate.setDate(lastReminderDate.getDate() + reminderWindowStartDays);
    const todayStr = today.toISOString().split('T')[0] ?? '';
    const lastReminderDateStr = lastReminderDate.toISOString().split('T')[0] ?? '';

    const data = await db
      .select()
      .from(table)
      .where(and(
        eq(table.profile_id, profileId),
        gte(table.expiry_date, todayStr),
        lte(table.expiry_date, lastReminderDateStr),
      ));

    return (data as Record<string, unknown>[]).map((item) => {
      const expiryDate = new Date(item.expiry_date as string);
      expiryDate.setHours(0, 0, 0, 0);
      const daysUntilExpiry = Math.round((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      return {
        id: item.id as string,
        entityType,
        expiryDate: item.expiry_date as string,
        daysUntilExpiry,
        name: getItemName(entityType, item),
        details: getItemDetails(entityType, item),
      };
    });
  } catch (error) {
    Logger.error(CONTEXT, `Failed to fetch expiring ${entityType}`, error);
    return [];
  }
}

function getItemName(entityType: EntityType, item: Record<string, unknown>): string {
  switch (entityType) {
    case 'firearms':
      return `${item.make} ${item.model}`;
    case 'vehicles':
      return `${item.make} ${item.model} (${item.registration_number})`;
    case 'certificates':
      return `${item.type} - ${item.first_name} ${item.last_name}`;
    case 'psira_officers':
      return `${item.first_name} ${item.last_name}`;
    case 'driver_licences':
      return `${item.initials} ${item.surname}`;
    default:
      return 'Unknown';
  }
}

function getItemDetails(entityType: EntityType, item: Record<string, unknown>): Record<string, unknown> {
  switch (entityType) {
    case 'firearms':
      return { type: item.type, make: item.make, model: item.model, caliber: item.caliber, serial_number: item.serial_number };
    case 'vehicles':
      return { make: item.make, model: item.model, year: item.year, registration_number: item.registration_number };
    case 'certificates':
      return { type: item.type, first_name: item.first_name, last_name: item.last_name, certificate_number: item.certificate_number };
    case 'psira_officers':
      return { first_name: item.first_name, last_name: item.last_name, sira_no: item.sira_no, id_number: item.id_number };
    case 'driver_licences':
      return { surname: item.surname, initials: item.initials, id_number: item.id_number, licence_number: item.licence_number };
    default:
      return {};
  }
}

export async function getExpiringRemindersBatch(
  limit = 1000,
  cursorId: string | null = null,
): Promise<IBatchReminderResult> {
  const data = await db.execute<{
    id: string;
    profile_id: string;
    email: string;
    entity_type: string;
    entity_id: string;
    item_name: string;
    expiry_date: string;
    days_until_expiry: number;
    details: Record<string, unknown>;
  }>(
    sql`SELECT * FROM get_expiring_reminders_batch(${limit + 1}, ${cursorId ?? null})`,
  );

  const rows = data as unknown as Array<{
    id: string;
    profile_id: string;
    email: string;
    entity_type: string;
    entity_id: string;
    item_name: string;
    expiry_date: string;
    days_until_expiry: number;
    details: Record<string, unknown>;
  }>;

  const hasMore = rows.length > limit;
  const items: IBatchReminderItem[] = rows.slice(0, limit).map((row) => ({
    id: row.id,
    profileId: row.profile_id,
    email: row.email,
    entityType: row.entity_type as EntityType,
    entityId: row.entity_id,
    itemName: row.item_name,
    expiryDate: row.expiry_date,
    daysUntilExpiry: row.days_until_expiry,
    details: row.details,
  }));

  const lastItem = items.at(-1);

  return {
    items,
    nextCursor: hasMore && lastItem ? lastItem.id : null,
  };
}

function mapToSetting(row: typeof reminderSettings.$inferSelect): IReminderSetting {
  return {
    id: row.id,
    profile_id: row.profile_id,
    entity_type: row.entity_type as EntityType,
    reminder_days: row.reminder_days,
    is_enabled: row.is_enabled,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}
