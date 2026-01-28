import type {
  IReminderSetting,
  IReminderSettingsResponse,
  IUpsertReminderSettingData,
  EntityType,
  IExpiringItem,
  IBatchReminderItem,
  IBatchReminderResult,
} from './types.js';
import { supabaseAdmin } from '../supabaseClient.js';
import { HttpError } from '../../../shared/types/errors/appError.js';
import { HTTP_STATUS } from '../../../shared/constants/httpStatus.js';
import { ENTITY_TABLE_MAP } from '../../../shared/constants/entities.js';
import { Logger } from '../../../shared/utils/logger.js';

export default class RemindersService {
  public static async getAllSettings(userId: string): Promise<IReminderSettingsResponse> {
    const { data, error } = await supabaseAdmin
      .from('reminder_settings')
      .select('*')
      .eq('profile_id', userId);

    if (error) {
      Logger.error('Failed to fetch reminder settings', 'REMINDERS_SERVICE', { error: error.message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to fetch reminder settings');
    }

    const settings = data as IReminderSetting[];

    const response: IReminderSettingsResponse = {
      firearms: null,
      vehicles: null,
      certificates: null,
      psira_officers: null,
      driver_licences: null,
    };

    for (const setting of settings) {
      response[setting.entity_type] = setting;
    }

    return response;
  }

  public static async upsertSetting(data: IUpsertReminderSettingData): Promise<IReminderSetting> {
    const { data: setting, error } = await supabaseAdmin
      .from('reminder_settings')
      .upsert({
        profile_id: data.profile_id,
        entity_type: data.entity_type,
        reminder_days: data.reminder_days,
        is_enabled: data.is_enabled,
      }, {
        onConflict: 'profile_id,entity_type',
      })
      .select()
      .single();

    if (error) {
      Logger.error('Failed to upsert reminder setting', 'REMINDERS_SERVICE', { error: error.message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to update reminder setting');
    }

    return setting as IReminderSetting;
  }

  public static async bulkUpsertSettings(
    userId: string,
    settings: Array<{ entity_type: EntityType; reminder_days: number[]; is_enabled: boolean }>,
  ): Promise<IReminderSettingsResponse> {
    const upsertData = settings.map((setting) => ({
      profile_id: userId,
      entity_type: setting.entity_type,
      reminder_days: setting.reminder_days,
      is_enabled: setting.is_enabled,
    }));

    const { error } = await supabaseAdmin
      .from('reminder_settings')
      .upsert(upsertData, {
        onConflict: 'profile_id,entity_type',
      });

    if (error) {
      Logger.error('Failed to bulk upsert reminder settings', 'REMINDERS_SERVICE', { error: error.message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to update reminder settings');
    }

    return this.getAllSettings(userId);
  }

  public static async deleteSetting(userId: string, entityType: EntityType): Promise<void> {
    const { error: findError } = await supabaseAdmin
      .from('reminder_settings')
      .select('id')
      .eq('profile_id', userId)
      .eq('entity_type', entityType)
      .single();

    if (findError) {
      Logger.warn('Reminder setting not found for deletion', 'REMINDERS_SERVICE', { userId, entityType });
      throw new HttpError(HTTP_STATUS.NOT_FOUND, 'Reminder setting not found');
    }

    const { error: deleteError } = await supabaseAdmin
      .from('reminder_settings')
      .delete()
      .eq('profile_id', userId)
      .eq('entity_type', entityType);

    if (deleteError) {
      Logger.error('Failed to delete reminder setting', 'REMINDERS_SERVICE', { error: deleteError.message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to delete reminder setting');
    }
  }

  public static async getAllEnabledSettings(): Promise<IReminderSetting[]> {
    const { data, error } = await supabaseAdmin
      .from('reminder_settings')
      .select('*')
      .eq('is_enabled', true);

    if (error) {
      Logger.error('Failed to fetch all enabled reminder settings', 'REMINDERS_SERVICE', { error: error.message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to fetch reminder settings');
    }

    return data as IReminderSetting[];
  }

  public static async getExpiringItems(
    entityType: EntityType,
    profileId: string,
    reminderDays: number[],
  ): Promise<IExpiringItem[]> {
    const tableName = ENTITY_TABLE_MAP[entityType];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const targetDates = reminderDays.map((days) => {
      const date = new Date(today);
      date.setDate(date.getDate() + days);
      return date.toISOString().split('T')[0];
    });

    const { data, error } = await supabaseAdmin
      .from(tableName)
      .select('*')
      .eq('profile_id', profileId)
      .in('expiry_date', targetDates);

    if (error) {
      Logger.error(`Failed to fetch expiring ${entityType}`, 'REMINDERS_SERVICE', { error: error.message });
      return [];
    }

    return data.map((item: Record<string, unknown>) => {
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
    const { data, error } = await supabaseAdmin.rpc('get_expiring_reminders_batch', {
      p_limit: limit + 1,
      p_cursor_id: cursorId ?? null,
    });

    if (error) {
      Logger.error('Failed to fetch expiring reminders batch', 'REMINDERS_SERVICE', { error: error.message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to fetch reminders');
    }

    const rows = (data ?? []) as Array<{
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
  }
}
