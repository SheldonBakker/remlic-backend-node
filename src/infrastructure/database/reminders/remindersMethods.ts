import type {
  IReminderSetting,
  IReminderSettingsResponse,
  IUpsertReminderSettingData,
  EntityType,
  IExpiringItem,
  IBatchReminderItem,
  IBatchReminderResult,
} from './types.js';
import db from '../drizzleClient.js';
import { reminderSettings, firearms, vehicles, certificates, psiraOfficers, driverLicences } from '../schema/index.js';
import { eq, and, inArray, sql } from 'drizzle-orm';
import { HttpError } from '../../../shared/types/errors/appError.js';
import { HTTP_STATUS } from '../../../shared/constants/httpStatus.js';
import { Logger } from '../../../shared/utils/logger.js';

type EntityTable = typeof firearms | typeof vehicles | typeof certificates | typeof psiraOfficers | typeof driverLicences;

const ENTITY_DRIZZLE_TABLE_MAP: Record<EntityType, EntityTable> = {
  firearms,
  vehicles,
  certificates,
  psira_officers: psiraOfficers,
  driver_licences: driverLicences,
};

export default class RemindersService {
  public static async getAllSettings(userId: string): Promise<IReminderSettingsResponse> {
    try {
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
        const setting = RemindersService.mapToSetting(row);
        response[setting.entity_type] = setting;
      }

      return response;
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      Logger.error('Failed to fetch reminder settings', 'REMINDERS_SERVICE', { error: (error as Error).message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to fetch reminder settings');
    }
  }

  public static async upsertSetting(data: IUpsertReminderSettingData): Promise<IReminderSetting> {
    try {
      const [setting] = await db
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
        .returning();

      if (!setting) {
        throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to update reminder setting');
      }

      return RemindersService.mapToSetting(setting);
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      Logger.error('Failed to upsert reminder setting', 'REMINDERS_SERVICE', { error: (error as Error).message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to update reminder setting');
    }
  }

  public static async bulkUpsertSettings(
    userId: string,
    settings: Array<{ entity_type: EntityType; reminder_days: number[]; is_enabled: boolean }>,
  ): Promise<IReminderSettingsResponse> {
    try {
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

      return this.getAllSettings(userId);
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      Logger.error('Failed to bulk upsert reminder settings', 'REMINDERS_SERVICE', { error: (error as Error).message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to update reminder settings');
    }
  }

  public static async deleteSetting(userId: string, entityType: EntityType): Promise<void> {
    try {
      const [existing] = await db
        .select({ id: reminderSettings.id })
        .from(reminderSettings)
        .where(and(eq(reminderSettings.profile_id, userId), eq(reminderSettings.entity_type, entityType)));

      if (!existing) {
        Logger.warn('Reminder setting not found for deletion', 'REMINDERS_SERVICE', { userId, entityType });
        throw new HttpError(HTTP_STATUS.NOT_FOUND, 'Reminder setting not found');
      }

      await db
        .delete(reminderSettings)
        .where(and(eq(reminderSettings.profile_id, userId), eq(reminderSettings.entity_type, entityType)));
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      Logger.error('Failed to delete reminder setting', 'REMINDERS_SERVICE', { error: (error as Error).message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to delete reminder setting');
    }
  }

  public static async getAllEnabledSettings(): Promise<IReminderSetting[]> {
    try {
      const data = await db
        .select()
        .from(reminderSettings)
        .where(eq(reminderSettings.is_enabled, true));

      return data.map((row) => RemindersService.mapToSetting(row));
    } catch (error) {
      Logger.error('Failed to fetch all enabled reminder settings', 'REMINDERS_SERVICE', { error: (error as Error).message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to fetch reminder settings');
    }
  }

  public static async getExpiringItems(
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
          name: RemindersService.getItemName(entityType, item),
          details: RemindersService.getItemDetails(entityType, item),
        };
      });
    } catch (error) {
      Logger.error(`Failed to fetch expiring ${entityType}`, 'REMINDERS_SERVICE', { error: (error as Error).message });
      return [];
    }
  }

  private static getItemName(entityType: EntityType, item: Record<string, unknown>): string {
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

  private static getItemDetails(entityType: EntityType, item: Record<string, unknown>): Record<string, unknown> {
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

  public static async getExpiringRemindersBatch(
    limit = 1000,
    cursorId?: string,
  ): Promise<IBatchReminderResult> {
    try {
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

      const lastItem = items[items.length - 1];

      return {
        items,
        nextCursor: hasMore && lastItem ? lastItem.id : null,
      };
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      Logger.error('Failed to fetch expiring reminders batch', 'REMINDERS_SERVICE', { error: (error as Error).message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to fetch reminders');
    }
  }

  private static mapToSetting(row: typeof reminderSettings.$inferSelect): IReminderSetting {
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
}
