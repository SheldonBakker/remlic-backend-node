import { z } from 'zod';
import type { ICreatePsiraOfficerRequest, IPsiraFilters } from './types.js';
import { createUuidSchema, sortOrderSchema } from '../../../shared/schemas/common.js';
import { validateOrThrow, validateIdOrThrow } from '../../../shared/utils/validationHelper.js';

const idNumberSchema = z.string()
  .regex(/^\d{13}$/, 'ID number must be exactly 13 digits');

const createOfficerSchema = z.object({
  IDNumber: z.string().regex(/^\d{13}$/, 'ID number must be exactly 13 digits'),
  FirstName: z.string().min(1, 'First name is required'),
  LastName: z.string().min(1, 'Last name is required'),
  Gender: z.string().min(1, 'Gender is required'),
  RequestStatus: z.string().min(1, 'Request status is required'),
  SIRANo: z.string().min(1, 'SIRA number is required'),
  ExpiryDate: z.string().min(1, 'Expiry date is required'),
}).strict();

const officerIdSchema = createUuidSchema('officer');

const psiraFiltersSchema = z.object({
  id_number: z.string()
    .min(1, 'ID number must not be empty')
    .optional(),
  sort_by: z.enum(['expiry_date'])
    .optional(),
  sort_order: sortOrderSchema.optional(),
}).passthrough();

export class PsiraValidation {
  public static validateIdNumber(id: unknown): string {
    return validateIdOrThrow(idNumberSchema, id, 'Invalid ID number format. Must be exactly 13 digits.');
  }

  public static validateCreateOfficer(data: unknown): ICreatePsiraOfficerRequest {
    return validateOrThrow(createOfficerSchema, data);
  }

  public static validateOfficerId(id: unknown): string {
    return validateIdOrThrow(officerIdSchema, id, 'Invalid officer ID format');
  }

  public static validateFilters(query: unknown): IPsiraFilters {
    return validateOrThrow(psiraFiltersSchema, query, 'Invalid filter parameters');
  }
}
