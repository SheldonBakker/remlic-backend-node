import { z } from 'zod';
import type { EntityType, IUpdateReminderSettingRequest, IBulkUpdateReminderSettingsRequest } from './types';
import { HttpError } from '../../../shared/types/errors/appError';
import { HTTP_STATUS } from '../../../shared/constants/httpStatus';
import { withAtLeastOneField } from '../../../shared/schemas/common';
import { validateOrThrow } from '../../../shared/utils/validationHelper';
import { ENTITY_TYPES } from '../../../shared/constants/entities';

const entityTypeSchema = z.enum(ENTITY_TYPES);
const entityTypeMessage = ENTITY_TYPES.join(', ');

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
    .max(5, 'Maximum 5 settings allowed')
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
        `Invalid entity type. Must be one of: ${entityTypeMessage}`,
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
