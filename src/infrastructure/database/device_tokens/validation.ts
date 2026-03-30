import { z } from 'zod';
import { validateOrThrow } from '../../../shared/utils/validationHelper.js';
import type { IRegisterTokenData } from './types.js';

const registerTokenSchema = z.object({
  player_id: z.string().min(1, 'player_id is required'),
});

export class DeviceTokenValidation {
  public static validateRegister(data: unknown): Pick<IRegisterTokenData, 'player_id'> {
    return validateOrThrow(registerTokenSchema, data);
  }
}
