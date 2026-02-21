import { z } from 'zod';
import type { ICreateFirearmRequest, IUpdateFirearmRequest, IFirearmsFilters } from './types';
import { dateSchema, createUuidSchema, sortOrderSchema, withAtLeastOneField } from '../../../shared/schemas/common';
import { validateOrThrow, validateIdOrThrow } from '../../../shared/utils/validationHelper';

const createFirearmSchema = z.object({
  type: z.string()
    .min(1, 'Type is required')
    .max(100, 'Type must not exceed 100 characters'),
  make: z.string()
    .min(1, 'Make is required')
    .max(100, 'Make must not exceed 100 characters'),
  model: z.string()
    .min(1, 'Model is required')
    .max(100, 'Model must not exceed 100 characters'),
  caliber: z.string()
    .min(1, 'Caliber is required')
    .max(50, 'Caliber must not exceed 50 characters'),
  serial_number: z.string()
    .max(100, 'Serial number must not exceed 100 characters')
    .nullable()
    .default(null),
  expiry_date: dateSchema,
}).strict();

const updateFirearmSchema = withAtLeastOneField(z.object({
  type: z.string()
    .min(1, 'Type must not be empty')
    .max(100, 'Type must not exceed 100 characters')
    .optional(),
  make: z.string()
    .min(1, 'Make must not be empty')
    .max(100, 'Make must not exceed 100 characters')
    .optional(),
  model: z.string()
    .min(1, 'Model must not be empty')
    .max(100, 'Model must not exceed 100 characters')
    .optional(),
  caliber: z.string()
    .min(1, 'Caliber must not be empty')
    .max(50, 'Caliber must not exceed 50 characters')
    .optional(),
  serial_number: z.string()
    .max(100, 'Serial number must not exceed 100 characters')
    .nullable()
    .optional(),
  expiry_date: dateSchema.optional(),
}).strict());

const firearmIdSchema = createUuidSchema('firearm');

const firearmsFiltersSchema = z.object({
  serial_number: z.string()
    .min(1, 'Serial number must not be empty')
    .optional(),
  sort_by: z.enum(['expiry_date'])
    .optional(),
  sort_order: sortOrderSchema.optional(),
}).passthrough();

export class FirearmsValidation {
  public static validateCreateFirearm(data: unknown): ICreateFirearmRequest {
    return validateOrThrow(createFirearmSchema, data);
  }

  public static validateFirearmId(id: unknown): string {
    return validateIdOrThrow(firearmIdSchema, id, 'Invalid firearm ID format');
  }

  public static validateFilters(query: unknown): IFirearmsFilters {
    return validateOrThrow(firearmsFiltersSchema, query, 'Invalid filter parameters');
  }

  public static validateUpdateFirearm(data: unknown): IUpdateFirearmRequest {
    return validateOrThrow(updateFirearmSchema, data);
  }
}
