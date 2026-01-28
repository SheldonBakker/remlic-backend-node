export type EntityType = 'firearms' | 'vehicles' | 'certificates' | 'psira_officers' | 'driver_licences';

export interface IReminderSetting {
  id: string;
  profile_id: string;
  entity_type: EntityType;
  reminder_days: number[];
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface IUpdateReminderSettingRequest {
  reminder_days?: number[];
  is_enabled?: boolean;
}

export interface IReminderSettingsResponse {
  firearms: IReminderSetting | null;
  vehicles: IReminderSetting | null;
  certificates: IReminderSetting | null;
  psira_officers: IReminderSetting | null;
  driver_licences: IReminderSetting | null;
}

export interface IBulkUpdateReminderSettingsRequest {
  settings: Array<{
    entity_type: EntityType;
    reminder_days: number[];
    is_enabled: boolean;
  }>;
}

export interface IUpsertReminderSettingData {
  profile_id: string;
  entity_type: EntityType;
  reminder_days: number[];
  is_enabled: boolean;
}

export interface IExpiringItem {
  id: string;
  entityType: EntityType;
  expiryDate: string;
  daysUntilExpiry: number;
  name: string;
  details: Record<string, unknown>;
}

export interface IBatchReminderItem {
  id: string;
  profileId: string;
  email: string;
  entityType: EntityType;
  entityId: string;
  itemName: string;
  expiryDate: string;
  daysUntilExpiry: number;
  details: Record<string, unknown>;
}

export interface IBatchReminderResult {
  items: IBatchReminderItem[];
  nextCursor: string | null;
}
