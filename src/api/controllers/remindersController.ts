import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../../shared/types/request';
import { ResponseUtil } from '../../shared/utils/response';
import { HTTP_STATUS } from '../../shared/constants/httpStatus';
import { requireUser } from '../../shared/utils/authHelpers';
import {
  getAllSettings,
  upsertSetting,
  bulkUpsertSettings,
  deleteSetting,
} from '../../infrastructure/database/reminders/remindersMethods';
import { RemindersValidation } from '../../infrastructure/database/reminders/validation';

export const list = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: userId } = requireUser(req);
    const settings = await getAllSettings(userId);
    ResponseUtil.success(res, { settings }, HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};

export const update = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: userId } = requireUser(req);
    const entityType = RemindersValidation.validateEntityType(req.params.entityType);
    const validatedData = RemindersValidation.validateUpdateReminderSetting(req.body);
    const setting = await upsertSetting({
      profile_id: userId,
      entity_type: entityType,
      reminder_days: validatedData.reminder_days ?? [],
      is_enabled: validatedData.is_enabled ?? true,
    });
    ResponseUtil.success(res, { setting }, HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};

export const bulkUpdate = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: userId } = requireUser(req);
    const validatedData = RemindersValidation.validateBulkUpdate(req.body);
    const settings = await bulkUpsertSettings(userId, validatedData.settings);
    ResponseUtil.success(res, { settings }, HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};

export const remove = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: userId } = requireUser(req);
    const entityType = RemindersValidation.validateEntityType(req.params.entityType);
    await deleteSetting(userId, entityType);
    ResponseUtil.success(res, { message: 'Reminder setting deleted successfully' }, HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};
