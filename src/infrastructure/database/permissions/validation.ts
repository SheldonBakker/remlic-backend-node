import { z } from 'zod';
import type { ICreatePermissionRequest, IUpdatePermissionRequest } from './types.js';
import { createUuidSchema, withAtLeastOneField } from '../../../shared/schemas/common.js';
import { validateOrThrow, validateIdOrThrow } from '../../../shared/utils/validationHelper.js';

const createPermissionSchema = z.object({
  permission_name: z.string()
    .min(1, 'Permission name is required')
    .max(100, 'Permission name must not exceed 100 characters'),
  psira_access: z.boolean().optional().default(false),
  firearm_access: z.boolean().optional().default(false),
  vehicle_access: z.boolean().optional().default(false),
  certificate_access: z.boolean().optional().default(false),
  drivers_access: z.boolean().optional().default(false),
}).strict();

const updatePermissionSchema = withAtLeastOneField(z.object({
  permission_name: z.string()
    .min(1, 'Permission name must not be empty')
    .max(100, 'Permission name must not exceed 100 characters')
    .optional(),
  psira_access: z.boolean().optional(),
  firearm_access: z.boolean().optional(),
  vehicle_access: z.boolean().optional(),
  certificate_access: z.boolean().optional(),
  drivers_access: z.boolean().optional(),
}).strict());

const permissionIdSchema = createUuidSchema('permission');

export class PermissionsValidation {
  public static validateCreatePermission(data: unknown): ICreatePermissionRequest {
    return validateOrThrow(createPermissionSchema, data);
  }

  public static validatePermissionId(id: unknown): string {
    return validateIdOrThrow(permissionIdSchema, id, 'Invalid permission ID format');
  }

  public static validateUpdatePermission(data: unknown): IUpdatePermissionRequest {
    return validateOrThrow(updatePermissionSchema, data);
  }
}
