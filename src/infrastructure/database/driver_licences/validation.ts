import { z } from 'zod';
import { dateSchema, createUuidSchema } from '../../../shared/schemas/common.js';
import { validateOrThrow, validateIdOrThrow } from '../../../shared/utils/validationHelper.js';
import type {
  ICreateDriverLicenceRequest,
  IUpdateDriverLicenceRequest,
  IDriverLicenceFilters,
} from './types.js';

const surnameSchema = z
  .string()
  .min(1, 'Surname is required')
  .max(100, 'Surname must be at most 100 characters');

const initialsSchema = z
  .string()
  .min(1, 'Initials are required')
  .max(20, 'Initials must be at most 20 characters')
  .regex(/^[A-Z\s.]+$/, 'Initials must contain only uppercase letters, spaces, and periods');

const idNumberSchema = z
  .string()
  .regex(/^\d{13}$/, 'ID number must be exactly 13 digits');

const createDriverLicenceSchema = z.object({
  surname: surnameSchema,
  initials: initialsSchema,
  id_number: idNumberSchema,
  expiry_date: dateSchema,
});

const updateDriverLicenceSchema = z
  .object({
    surname: surnameSchema.optional(),
    initials: initialsSchema.optional(),
    id_number: idNumberSchema.optional(),
    expiry_date: dateSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

const sortBySchema = z.enum(['surname', 'expiry_date', 'created_at']).optional();
const sortOrderSchema = z.enum(['asc', 'desc']).optional();

const filtersSchema = z.object({
  surname: z.string().optional(),
  id_number: idNumberSchema.optional(),
  sort_by: sortBySchema,
  sort_order: sortOrderSchema,
});

const driverLicenceIdSchema = createUuidSchema('driver licence');

export class DriverLicenceValidation {
  static validateCreateDriverLicence(data: unknown): ICreateDriverLicenceRequest {
    return validateOrThrow(createDriverLicenceSchema, data);
  }

  static validateUpdateDriverLicence(data: unknown): IUpdateDriverLicenceRequest {
    return validateOrThrow(updateDriverLicenceSchema, data);
  }

  static validateFilters(data: unknown): IDriverLicenceFilters {
    return validateOrThrow(filtersSchema, data);
  }

  static validateDriverLicenceId(id: unknown): string {
    return validateIdOrThrow(driverLicenceIdSchema, id, 'Invalid driver licence ID format');
  }
}
