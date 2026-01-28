import { z } from 'zod';
import type { ICreatePackageRequest, IUpdatePackageRequest, IPackagesFilters } from './types.js';
import { createUuidSchema, withAtLeastOneField } from '../../../shared/schemas/common.js';
import { validateOrThrow, validateIdOrThrow } from '../../../shared/utils/validationHelper.js';

const packageTypeEnum = z.enum(['monthly', 'yearly']);

const createPackageSchema = z.object({
  package_name: z.string()
    .min(1, 'Package name is required')
    .max(100, 'Package name must not exceed 100 characters'),
  slug: z.string()
    .min(1, 'Slug is required')
    .max(50, 'Slug must not exceed 50 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  type: packageTypeEnum,
  permission_id: z.string().uuid('Invalid permission ID format'),
  description: z.string()
    .max(500, 'Description must not exceed 500 characters')
    .optional(),
}).strict();

const updatePackageSchema = withAtLeastOneField(z.object({
  package_name: z.string()
    .min(1, 'Package name must not be empty')
    .max(100, 'Package name must not exceed 100 characters')
    .optional(),
  slug: z.string()
    .min(1, 'Slug must not be empty')
    .max(50, 'Slug must not exceed 50 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .optional(),
  type: packageTypeEnum.optional(),
  permission_id: z.string().uuid('Invalid permission ID format').optional(),
  description: z.string()
    .max(500, 'Description must not exceed 500 characters')
    .nullable()
    .optional(),
  is_active: z.boolean().optional(),
}).strict());

const packageIdSchema = createUuidSchema('package');

const slugSchema = z.string()
  .min(1, 'Slug is required')
  .max(50, 'Slug must not exceed 50 characters')
  .regex(/^[a-z0-9-]+$/, 'Invalid slug format');

const packagesFiltersSchema = z.object({
  is_active: z.preprocess(
    (val) => val === 'true' ? true : val === 'false' ? false : val,
    z.boolean().optional(),
  ),
  type: packageTypeEnum.optional(),
}).passthrough();

export class PackagesValidation {
  public static validateCreatePackage(data: unknown): ICreatePackageRequest {
    return validateOrThrow(createPackageSchema, data);
  }

  public static validatePackageId(id: unknown): string {
    return validateIdOrThrow(packageIdSchema, id, 'Invalid package ID format');
  }

  public static validateSlug(slug: unknown): string {
    return validateIdOrThrow(slugSchema, slug, 'Invalid slug format');
  }

  public static validateFilters(query: unknown): IPackagesFilters {
    return validateOrThrow(packagesFiltersSchema, query, 'Invalid filter parameters');
  }

  public static validateUpdatePackage(data: unknown): IUpdatePackageRequest {
    return validateOrThrow(updatePackageSchema, data);
  }
}
