import type { IFirearm, ICreateFirearmData, IUpdateFirearmData, IFirearmsFilters } from './types.js';
import db from '../drizzleClient.js';
import { firearms } from '../schema/index.js';
import { eq, or, lt, and, desc, asc, ilike, type SQL } from 'drizzle-orm';
import { HttpError } from '../../../shared/types/errors/appError.js';
import { HTTP_STATUS } from '../../../shared/constants/httpStatus.js';
import { Logger } from '../../../shared/utils/logging/logger.js';
import { PaginationUtil, type ICursorParams, type IPaginatedResult } from '../../../shared/utils/pagination.js';
import { buildPartialUpdate } from '../../../shared/utils/updateBuilder.js';

export default class FirearmsService {
  public static async getFirearmsByUserId(
    userId: string,
    params: ICursorParams,
    filters: IFirearmsFilters = {},
  ): Promise<IPaginatedResult<IFirearm>> {
    try {
      const cursor = PaginationUtil.decodeCursor(params.cursor);

      const conditions: SQL[] = [eq(firearms.profile_id, userId)];

      if (filters.serial_number) {
        conditions.push(ilike(firearms.serial_number, filters.serial_number));
      }

      if (cursor) {
        const cursorCondition = or(
          lt(firearms.created_at, new Date(cursor.created_at)),
          and(eq(firearms.created_at, new Date(cursor.created_at)), lt(firearms.id, cursor.id)),
        );
        if (cursorCondition) {
          conditions.push(cursorCondition);
        }
      }

      const orderClauses = [];
      if (filters.sort_by) {
        const col = firearms[filters.sort_by as keyof typeof firearms.$inferSelect];
        orderClauses.push(filters.sort_order === 'asc' ? asc(col as unknown as SQL) : desc(col as unknown as SQL));
      }
      orderClauses.push(desc(firearms.created_at), desc(firearms.id));

      const data = await db
        .select()
        .from(firearms)
        .where(and(...conditions))
        .orderBy(...orderClauses)
        .limit(params.limit);

      const items = data.map((row) => FirearmsService.mapToFirearm(row));
      const pagination = PaginationUtil.buildPagination(items, params.limit);

      return { items, pagination };
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      Logger.error('Failed to fetch firearms', 'FIREARMS_SERVICE', { error: (error as Error).message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to fetch firearms');
    }
  }

  public static async getFirearmById(firearmId: string, userId: string): Promise<IFirearm> {
    try {
      const [data] = await db
        .select()
        .from(firearms)
        .where(and(eq(firearms.id, firearmId), eq(firearms.profile_id, userId)));

      if (!data) {
        Logger.warn('Firearm not found', 'FIREARMS_SERVICE', { firearmId, userId });
        throw new HttpError(HTTP_STATUS.NOT_FOUND, 'Firearm not found');
      }

      return FirearmsService.mapToFirearm(data);
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      Logger.error('Failed to fetch firearm', 'FIREARMS_SERVICE', { error: (error as Error).message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to fetch firearm');
    }
  }

  public static async createFirearm(data: ICreateFirearmData): Promise<IFirearm> {
    try {
      const [firearm] = await db
        .insert(firearms)
        .values({
          profile_id: data.profile_id,
          type: data.type,
          make: data.make,
          model: data.model,
          caliber: data.caliber,
          serial_number: data.serial_number ?? null,
          expiry_date: data.expiry_date,
        })
        .returning();

      if (!firearm) {
        throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to create firearm');
      }

      return FirearmsService.mapToFirearm(firearm);
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      const cause = (error as Record<string, unknown>).cause as Record<string, unknown> | undefined;
      if (cause?.code === '23505' || (error as Record<string, unknown>).code === '23505') {
        throw new HttpError(HTTP_STATUS.CONFLICT, 'A firearm with this serial number already exists');
      }
      Logger.error('Failed to create firearm', 'FIREARMS_SERVICE', { error: (error as Error).message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to create firearm');
    }
  }

  public static async updateFirearm(data: IUpdateFirearmData): Promise<IFirearm> {
    try {
      const [existing] = await db
        .select({ id: firearms.id })
        .from(firearms)
        .where(and(eq(firearms.id, data.id), eq(firearms.profile_id, data.profile_id)));

      if (!existing) {
        Logger.warn('Firearm not found for update', 'FIREARMS_SERVICE', { firearmId: data.id, userId: data.profile_id });
        throw new HttpError(HTTP_STATUS.NOT_FOUND, 'Firearm not found');
      }

      const updateData = buildPartialUpdate(data, ['type', 'make', 'model', 'caliber', 'serial_number', 'expiry_date']);

      const [firearm] = await db
        .update(firearms)
        .set(updateData)
        .where(and(eq(firearms.id, data.id), eq(firearms.profile_id, data.profile_id)))
        .returning();

      if (!firearm) {
        throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to update firearm');
      }

      return FirearmsService.mapToFirearm(firearm);
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      const cause = (error as Record<string, unknown>).cause as Record<string, unknown> | undefined;
      if (cause?.code === '23505' || (error as Record<string, unknown>).code === '23505') {
        throw new HttpError(HTTP_STATUS.CONFLICT, 'A firearm with this serial number already exists');
      }
      Logger.error('Failed to update firearm', 'FIREARMS_SERVICE', { error: (error as Error).message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to update firearm');
    }
  }

  public static async deleteFirearm(firearmId: string, userId: string): Promise<void> {
    try {
      const [existing] = await db
        .select({ id: firearms.id })
        .from(firearms)
        .where(and(eq(firearms.id, firearmId), eq(firearms.profile_id, userId)));

      if (!existing) {
        Logger.warn('Firearm not found for deletion', 'FIREARMS_SERVICE', { firearmId, userId });
        throw new HttpError(HTTP_STATUS.NOT_FOUND, 'Firearm not found');
      }

      await db
        .delete(firearms)
        .where(and(eq(firearms.id, firearmId), eq(firearms.profile_id, userId)));
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      Logger.error('Failed to delete firearm', 'FIREARMS_SERVICE', { error: (error as Error).message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to delete firearm');
    }
  }

  private static mapToFirearm(row: typeof firearms.$inferSelect): IFirearm {
    return {
      id: row.id,
      profile_id: row.profile_id,
      type: row.type,
      make: row.make,
      model: row.model,
      caliber: row.caliber,
      serial_number: row.serial_number,
      expiry_date: row.expiry_date,
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString(),
    };
  }
}
