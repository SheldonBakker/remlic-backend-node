import { z } from 'zod';
import type { ISignupRequest } from './types.js';
import { validateOrThrow } from '../../../shared/utils/validationHelper.js';

const signupSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .min(1, 'Email is required'),
  phone: z.string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format (E.164 format expected)')
    .min(1, 'Phone number is required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password must not exceed 72 characters'),
}).strict();

export class AuthValidation {
  public static validateSignup(data: unknown): ISignupRequest {
    return validateOrThrow(signupSchema, data);
  }
}
