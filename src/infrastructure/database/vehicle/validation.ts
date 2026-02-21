import { z } from 'zod';
import type { ICreateVehicleRequest, IUpdateVehicleRequest, IVehicleFilters } from './types';
import { dateSchema, createUuidSchema, sortOrderSchema, withAtLeastOneField } from '../../../shared/schemas/common';
import { validateOrThrow, validateIdOrThrow } from '../../../shared/utils/validationHelper';

const VEHICLE_YEAR_MIN = 1900;
const VEHICLE_YEAR_MAX = 2100;

const createVehicleSchema = z.object({
  make: z.string()
    .min(1, 'Make is required')
    .max(100, 'Make must not exceed 100 characters'),
  model: z.string()
    .min(1, 'Model is required')
    .max(100, 'Model must not exceed 100 characters'),
  year: z.number()
    .int('Year must be an integer')
    .min(VEHICLE_YEAR_MIN, `Year must be ${VEHICLE_YEAR_MIN} or later`)
    .max(VEHICLE_YEAR_MAX, `Year must not exceed ${VEHICLE_YEAR_MAX}`),
  vin_number: z.string()
    .max(17, 'VIN number must not exceed 17 characters')
    .nullable()
    .default(null),
  registration_number: z.string()
    .min(1, 'Registration number is required')
    .max(20, 'Registration number must not exceed 20 characters'),
  expiry_date: dateSchema,
});

const updateVehicleSchema = withAtLeastOneField(z.object({
  make: z.string()
    .min(1, 'Make must not be empty')
    .max(100, 'Make must not exceed 100 characters')
    .optional(),
  model: z.string()
    .min(1, 'Model must not be empty')
    .max(100, 'Model must not exceed 100 characters')
    .optional(),
  year: z.number()
    .int('Year must be an integer')
    .min(VEHICLE_YEAR_MIN, `Year must be ${VEHICLE_YEAR_MIN} or later`)
    .max(VEHICLE_YEAR_MAX, `Year must not exceed ${VEHICLE_YEAR_MAX}`)
    .optional(),
  vin_number: z.string()
    .max(17, 'VIN number must not exceed 17 characters')
    .nullable()
    .optional(),
  registration_number: z.string()
    .min(1, 'Registration number must not be empty')
    .max(20, 'Registration number must not exceed 20 characters')
    .optional(),
  expiry_date: dateSchema.optional(),
}));

const vehicleIdSchema = createUuidSchema('vehicle');

const vehicleFiltersSchema = z.object({
  year: z.coerce.number()
    .int('Year must be an integer')
    .min(VEHICLE_YEAR_MIN, `Year must be ${VEHICLE_YEAR_MIN} or later`)
    .max(VEHICLE_YEAR_MAX, `Year must not exceed ${VEHICLE_YEAR_MAX}`)
    .optional(),
  registration_number: z.string()
    .min(1, 'Registration number must not be empty')
    .max(20, 'Registration number must not exceed 20 characters')
    .transform((val) => val.replace(/\s+/g, ''))
    .optional(),
  sort_by: z.enum(['year', 'expiry_date'])
    .optional(),
  sort_order: sortOrderSchema.optional(),
}).passthrough();

export class VehicleValidation {
  public static validateCreateVehicle(data: unknown): ICreateVehicleRequest {
    return validateOrThrow(createVehicleSchema, data);
  }

  public static validateVehicleId(id: unknown): string {
    return validateIdOrThrow(vehicleIdSchema, id, 'Invalid vehicle ID format');
  }

  public static validateFilters(query: unknown): IVehicleFilters {
    return validateOrThrow(vehicleFiltersSchema, query, 'Invalid filter parameters');
  }

  public static validateUpdateVehicle(data: unknown): IUpdateVehicleRequest {
    return validateOrThrow(updateVehicleSchema, data);
  }
}
