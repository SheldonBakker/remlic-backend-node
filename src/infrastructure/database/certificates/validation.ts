import { z } from 'zod';
import type { ICreateCertificateRequest, IUpdateCertificateRequest, ICertificatesFilters } from './types.js';
import { dateSchema, createUuidSchema, sortOrderSchema, withAtLeastOneField } from '../../../shared/schemas/common.js';
import { validateOrThrow, validateIdOrThrow } from '../../../shared/utils/validationHelper.js';

const createCertificateSchema = z.object({
  type: z.string()
    .min(1, 'Type is required')
    .max(100, 'Type must not exceed 100 characters'),
  first_name: z.string()
    .min(1, 'First name is required')
    .max(100, 'First name must not exceed 100 characters'),
  last_name: z.string()
    .min(1, 'Last name is required')
    .max(100, 'Last name must not exceed 100 characters'),
  certificate_number: z.string()
    .min(1, 'Certificate number is required')
    .max(100, 'Certificate number must not exceed 100 characters'),
  expiry_date: dateSchema,
}).strict();

const updateCertificateSchema = withAtLeastOneField(z.object({
  type: z.string()
    .min(1, 'Type must not be empty')
    .max(100, 'Type must not exceed 100 characters')
    .optional(),
  first_name: z.string()
    .min(1, 'First name must not be empty')
    .max(100, 'First name must not exceed 100 characters')
    .optional(),
  last_name: z.string()
    .min(1, 'Last name must not be empty')
    .max(100, 'Last name must not exceed 100 characters')
    .optional(),
  certificate_number: z.string()
    .min(1, 'Certificate number must not be empty')
    .max(100, 'Certificate number must not exceed 100 characters')
    .optional(),
  expiry_date: dateSchema.optional(),
}).strict());

const certificateIdSchema = createUuidSchema('certificate');

const certificatesFiltersSchema = z.object({
  certificate_number: z.string()
    .min(1, 'Certificate number must not be empty')
    .optional(),
  sort_by: z.enum(['expiry_date'])
    .optional(),
  sort_order: sortOrderSchema.optional(),
}).passthrough();

export class CertificatesValidation {
  public static validateCreateCertificate(data: unknown): ICreateCertificateRequest {
    return validateOrThrow(createCertificateSchema, data);
  }

  public static validateCertificateId(id: unknown): string {
    return validateIdOrThrow(certificateIdSchema, id, 'Invalid certificate ID format');
  }

  public static validateFilters(query: unknown): ICertificatesFilters {
    return validateOrThrow(certificatesFiltersSchema, query, 'Invalid filter parameters');
  }

  public static validateUpdateCertificate(data: unknown): IUpdateCertificateRequest {
    return validateOrThrow(updateCertificateSchema, data);
  }
}
