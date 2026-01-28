import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../../shared/types/request.js';
import { ResponseUtil } from '../../shared/utils/response.js';
import { HTTP_STATUS } from '../../shared/constants/httpStatus.js';
import { HttpError } from '../../shared/types/errors/appError.js';
import RemindersService from '../../infrastructure/database/reminders/remindersMethods.js';
import { RemindersValidation } from '../../infrastructure/database/reminders/validation.js';

export default class RemindersController {
  public static getReminderSettings = async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      throw new HttpError(HTTP_STATUS.UNAUTHORIZED, 'User not authenticated');
    }

    const settings = await RemindersService.getAllSettings(userId);

    ResponseUtil.success(res, { settings }, HTTP_STATUS.OK);
  };

  public static updateReminderSetting = async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      throw new HttpError(HTTP_STATUS.UNAUTHORIZED, 'User not authenticated');
    }

    const entityType = RemindersValidation.validateEntityType(req.params.entityType);
    const validatedData = RemindersValidation.validateUpdateReminderSetting(req.body);

    const setting = await RemindersService.upsertSetting({
      profile_id: userId,
      entity_type: entityType,
      reminder_days: validatedData.reminder_days ?? [],
      is_enabled: validatedData.is_enabled ?? true,
    });

    ResponseUtil.success(res, { setting }, HTTP_STATUS.OK);
  };

  public static bulkUpdateReminderSettings = async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      throw new HttpError(HTTP_STATUS.UNAUTHORIZED, 'User not authenticated');
    }

    const validatedData = RemindersValidation.validateBulkUpdate(req.body);
    const settings = await RemindersService.bulkUpsertSettings(userId, validatedData.settings);

    ResponseUtil.success(res, { settings }, HTTP_STATUS.OK);
  };

  public static deleteReminderSetting = async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      throw new HttpError(HTTP_STATUS.UNAUTHORIZED, 'User not authenticated');
    }

    const entityType = RemindersValidation.validateEntityType(req.params.entityType);
    await RemindersService.deleteSetting(userId, entityType);

    ResponseUtil.success(res, { message: 'Reminder setting deleted successfully' }, HTTP_STATUS.OK);
  };
}
