import type { IVehicle, ICreateVehicleData, IUpdateVehicleData, IVehicleFilters } from './types.js';
import db from '../drizzleClient.js';
import { vehicles } from '../schema/index.js';
import { eq, or, lt, and, desc, asc, inArray, sql, type SQL } from 'drizzle-orm';
import { HttpError } from '../../../shared/types/errors/appError.js';
import { HTTP_STATUS } from '../../../shared/constants/httpStatus.js';
import { Logger } from '../../../shared/utils/logger.js';
import { PaginationUtil, type ICursorParams, type IPaginatedResult } from '../../../shared/utils/pagination.js';
import { buildPartialUpdate } from '../../../shared/utils/updateBuilder.js';

export default class VehicleService {
  public static async getVehiclesByUserId(
    userId: string,
    params: ICursorParams,
    filters: IVehicleFilters = {},
  ): Promise<IPaginatedResult<IVehicle>> {
    try {
      const cursor = PaginationUtil.decodeCursor(params.cursor);

      const conditions: SQL[] = [eq(vehicles.profile_id, userId)];

      if (filters.year !== undefined) {
        conditions.push(eq(vehicles.year, filters.year));
      }

      if (filters.registration_number !== undefined) {
        const matchingVehicles = await db.execute<{ id: string }>(
          sql`SELECT id FROM search_vehicles_by_registration(${userId}, ${filters.registration_number})`,
        );

        const matchingIds = matchingVehicles.map((v) => v.id);
        if (matchingIds.length === 0) {
          return { items: [], pagination: { nextCursor: null } };
        }
        conditions.push(inArray(vehicles.id, matchingIds));
      }

      if (cursor) {
        const cursorCondition = or(
          lt(vehicles.created_at, new Date(cursor.created_at)),
          and(eq(vehicles.created_at, new Date(cursor.created_at)), lt(vehicles.id, cursor.id)),
        );
        if (cursorCondition) {
          conditions.push(cursorCondition);
        }
      }

      const orderClauses = [];
      if (filters.sort_by) {
        const col = vehicles[filters.sort_by as keyof typeof vehicles.$inferSelect];
        orderClauses.push(filters.sort_order === 'asc' ? asc(col as unknown as SQL) : desc(col as unknown as SQL));
      }
      orderClauses.push(desc(vehicles.created_at), desc(vehicles.id));

      const data = await db
        .select()
        .from(vehicles)
        .where(and(...conditions))
        .orderBy(...orderClauses)
        .limit(params.limit);

      const items = data.map((row) => VehicleService.mapToVehicle(row));
      const pagination = PaginationUtil.buildPagination(items, params.limit);

      return { items, pagination };
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      Logger.error('Failed to fetch vehicles', 'VEHICLE_SERVICE', { error: (error as Error).message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to fetch vehicles');
    }
  }

  public static async getVehicleById(vehicleId: string, userId: string): Promise<IVehicle> {
    try {
      const [data] = await db
        .select()
        .from(vehicles)
        .where(and(eq(vehicles.id, vehicleId), eq(vehicles.profile_id, userId)));

      if (!data) {
        Logger.warn('Vehicle not found', 'VEHICLE_SERVICE', { vehicleId, userId });
        throw new HttpError(HTTP_STATUS.NOT_FOUND, 'Vehicle not found');
      }

      return VehicleService.mapToVehicle(data);
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      Logger.error('Failed to fetch vehicle', 'VEHICLE_SERVICE', { error: (error as Error).message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to fetch vehicle');
    }
  }

  public static async createVehicle(data: ICreateVehicleData): Promise<IVehicle> {
    try {
      const [vehicle] = await db
        .insert(vehicles)
        .values({
          profile_id: data.profile_id,
          make: data.make,
          model: data.model,
          year: data.year,
          vin_number: data.vin_number ?? null,
          registration_number: data.registration_number,
          expiry_date: data.expiry_date,
        })
        .returning();

      if (!vehicle) {
        throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to create vehicle');
      }

      return VehicleService.mapToVehicle(vehicle);
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      Logger.error('Failed to create vehicle', 'VEHICLE_SERVICE', { error: (error as Error).message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to create vehicle');
    }
  }

  public static async updateVehicle(data: IUpdateVehicleData): Promise<IVehicle> {
    try {
      const [existing] = await db
        .select({ id: vehicles.id })
        .from(vehicles)
        .where(and(eq(vehicles.id, data.id), eq(vehicles.profile_id, data.profile_id)));

      if (!existing) {
        Logger.warn('Vehicle not found for update', 'VEHICLE_SERVICE', { vehicleId: data.id, userId: data.profile_id });
        throw new HttpError(HTTP_STATUS.NOT_FOUND, 'Vehicle not found');
      }

      const updateData = buildPartialUpdate(data, ['make', 'model', 'year', 'vin_number', 'registration_number', 'expiry_date']);

      const [vehicle] = await db
        .update(vehicles)
        .set(updateData)
        .where(and(eq(vehicles.id, data.id), eq(vehicles.profile_id, data.profile_id)))
        .returning();

      if (!vehicle) {
        throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to update vehicle');
      }

      return VehicleService.mapToVehicle(vehicle);
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      Logger.error('Failed to update vehicle', 'VEHICLE_SERVICE', { error: (error as Error).message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to update vehicle');
    }
  }

  public static async deleteVehicle(vehicleId: string, userId: string): Promise<void> {
    try {
      const [existing] = await db
        .select({ id: vehicles.id })
        .from(vehicles)
        .where(and(eq(vehicles.id, vehicleId), eq(vehicles.profile_id, userId)));

      if (!existing) {
        Logger.warn('Vehicle not found for deletion', 'VEHICLE_SERVICE', { vehicleId, userId });
        throw new HttpError(HTTP_STATUS.NOT_FOUND, 'Vehicle not found');
      }

      await db
        .delete(vehicles)
        .where(and(eq(vehicles.id, vehicleId), eq(vehicles.profile_id, userId)));
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      Logger.error('Failed to delete vehicle', 'VEHICLE_SERVICE', { error: (error as Error).message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to delete vehicle');
    }
  }

  private static mapToVehicle(row: typeof vehicles.$inferSelect): IVehicle {
    return {
      id: row.id,
      profile_id: row.profile_id,
      make: row.make,
      model: row.model,
      year: row.year,
      vin_number: row.vin_number,
      registration_number: row.registration_number,
      expiry_date: row.expiry_date,
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString(),
    };
  }
}
