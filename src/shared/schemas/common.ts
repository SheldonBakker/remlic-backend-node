import { z } from 'zod';

export const dateSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
  .refine((date) => {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime());
  }, 'Invalid date');

export function createUuidSchema(entityName: string): z.ZodString {
  return z.string().uuid(`Invalid ${entityName} ID format`);
}

export const sortOrderSchema = z.enum(['asc', 'desc']);

export const stringBooleanSchema = z
  .union([z.boolean(), z.literal('true'), z.literal('false')])
  .transform((val) => val === true || val === 'true');

export function withAtLeastOneField<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
): z.ZodEffects<z.ZodObject<T>> {
  return schema.refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });
}
