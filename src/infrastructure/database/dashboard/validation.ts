import { z } from 'zod';
import type { IDashboardFilters } from './types.js';
import { sortOrderSchema } from '../../../shared/schemas/common.js';
import { validateOrThrow } from '../../../shared/utils/validationHelper.js';

const dashboardFiltersSchema = z.object({
  record_type: z.enum(['firearms', 'vehicles', 'psira_officers', 'certificates'])
    .optional(),
  sort_order: sortOrderSchema.optional(),
  days_ahead: z.coerce.number().int().min(1).max(365),
  include_expired: z.coerce.boolean(),
}).passthrough();

export class DashboardValidation {
  public static validateFilters(query: unknown): IDashboardFilters {
    return validateOrThrow(dashboardFiltersSchema, query, 'Invalid filter parameters');
  }
}
