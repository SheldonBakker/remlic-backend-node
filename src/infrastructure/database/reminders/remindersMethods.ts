import type {
  IReminderSetting,
  IReminderSettingsResponse,
  IUpsertReminderSettingData,
  EntityType,
  IExpiringItem,
  IBatchReminderItem,
  IBatchReminderResult,
} from './types';
import db from '../databaseClient';
import { reminderSettings, firearms, vehicles, certificates, psiraOfficers, driverLicences } from '../schema/index';
import { eq, and, inArray, sql } from 'drizzle-orm';
import { HttpError } from '../../../shared/types/errors/appError';
import { HTTP_STATUS } from '../../../shared/constants/httpStatus';
import Logger from '../../../shared/utils/logger';

const CONTEXT = 'REMINDERS_SERVICE';

type EntityTable = typeof firearms | typeof vehicles | typeof certificates | typeof psiraOfficers | typeof driverLicences;

const ENTITY_DRIZZLE_TABLE_MAP: Record<EntityType, EntityTable> = {
  firearms,
  vehicles,
  certificates,
  psira_officers: psiraOfficers,
  driver_licences: driverLicences,
};

export async function getAllSettings(userId: string): Promise<IReminderSettingsResponse> {
  const data = await db
    .select()
    .from(reminderSettings)
    .where(eq(reminderSettings.profile_id, userId));

  const response: IReminderSettingsResponse = {
    firearms: null,
    vehicles: null,
    certificates: null,
    psira_officers: null,
    driver_licences: null,
  };

  for (const row of data) {
    const setting = mapToSetting(row);
    response[setting.entity_type] = setting;
  }

  return response;
}

export async function upsertSetting(data: IUpsertReminderSettingData): Promise<IReminderSetting> {
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

export async function bulkUpsertSettings(
  userId: string,
  settings: Array<{ entity_type: EntityType; reminder_days: number[]; is_enabled: boolean }>,
): Promise<IReminderSettingsResponse> {
  const upsertData = settings.map((setting) => ({
    profile_id: userId,
    entity_type: setting.entity_type,
    reminder_days: setting.reminder_days,
    is_enabled: setting.is_enabled,
  }));

  await Promise.all(upsertData.map((item) =>
    db
      .insert(reminderSettings)
      .values(item)
      .onConflictDoUpdate({
        target: [reminderSettings.profile_id, reminderSettings.entity_type],
        set: {
          reminder_days: item.reminder_days,
          is_enabled: item.is_enabled,
          updated_at: new Date(),
        },
      }),
  ));

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

export async function getExpiringItems(
  entityType: EntityType,
  profileId: string,
  reminderDays: number[],
): Promise<IExpiringItem[]> {
  try {
    const table = ENTITY_DRIZZLE_TABLE_MAP[entityType];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const targetDates = reminderDays.map((days) => {
      const date = new Date(today);
      date.setDate(date.getDate() + days);
      return date.toISOString().split('T')[0] ?? '';
    });

    const data = await db
      .select()
      .from(table)
      .where(and(
        eq(table.profile_id, profileId),
        inArray(table.expiry_date, targetDates),
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
