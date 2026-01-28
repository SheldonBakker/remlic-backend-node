import { z } from 'zod';
import type { EntityType, IUpdateReminderSettingRequest, IBulkUpdateReminderSettingsRequest } from './types.js';
import { HttpError } from '../../../shared/types/errors/appError.js';
import { HTTP_STATUS } from '../../../shared/constants/httpStatus.js';
import { withAtLeastOneField } from '../../../shared/schemas/common.js';
import { validateOrThrow } from '../../../shared/utils/validationHelper.js';

const entityTypeSchema = z.enum(['firearms', 'vehicles', 'certificates', 'psira_officers']);

const reminderDaysSchema = z.array(z.number().int().min(1).max(365))
  .min(1, 'At least one reminder day is required')
  .max(10, 'Maximum 10 reminder days allowed')
  .refine((days) => new Set(days).size === days.length, {
    message: 'Reminder days must be unique',
  });

const updateReminderSettingSchema = withAtLeastOneField(z.object({
  reminder_days: reminderDaysSchema.optional(),
  is_enabled: z.boolean().optional(),
}).strict());

const bulkSettingSchema = z.object({
  entity_type: entityTypeSchema,
  reminder_days: reminderDaysSchema,
  is_enabled: z.boolean(),
}).strict();

const bulkUpdateSchema = z.object({
  settings: z.array(bulkSettingSchema)
    .min(1, 'At least one setting is required')
    .max(4, 'Maximum 4 settings allowed')
    .refine((settings) => {
      const entityTypes = settings.map((s) => s.entity_type);
      return new Set(entityTypes).size === entityTypes.length;
    }, {
      message: 'Duplicate entity types are not allowed',
    }),
}).strict();

export class RemindersValidation {
  public static validateEntityType(entityType: unknown): EntityType {
    const result = entityTypeSchema.safeParse(entityType);
    if (!result.success) {
      throw new HttpError(
        HTTP_STATUS.BAD_REQUEST,
        'Invalid entity type. Must be one of: firearms, vehicles, certificates, psira_officers',
      );
    }
    return result.data;
  }

  public static validateUpdateReminderSetting(data: unknown): IUpdateReminderSettingRequest {
    return validateOrThrow(updateReminderSettingSchema, data);
  }

  public static validateBulkUpdate(data: unknown): IBulkUpdateReminderSettingsRequest {
    return validateOrThrow(bulkUpdateSchema, data);
  }
}
