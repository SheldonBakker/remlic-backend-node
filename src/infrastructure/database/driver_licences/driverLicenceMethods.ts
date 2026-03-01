import type {
  IDriverLicence,
  ICreateDriverLicenceData,
  IUpdateDriverLicenceData,
  IDriverLicenceFilters,
} from './types.js';
import db from '../databaseClient.js';
import { driverLicences } from '../schema/index.js';
import { eq, or, lt, and, desc, asc, ilike, type SQL } from 'drizzle-orm';
import { HttpError } from '../../../shared/types/errors/appError.js';
import { HTTP_STATUS } from '../../../shared/constants/httpStatus.js';
import Logger from '../../../shared/utils/logger.js';
import { PaginationUtil, type ICursorParams, type IPaginatedResult } from '../../../shared/utils/pagination.js';
import { buildPartialUpdate } from '../../../shared/utils/updateBuilder.js';

const CONTEXT = 'DRIVER_LICENCE_SERVICE';

export async function getDriverLicencesByUserId(
  userId: string,
  params: ICursorParams,
  filters: IDriverLicenceFilters = {},
): Promise<IPaginatedResult<IDriverLicence>> {
  const cursor = PaginationUtil.decodeCursor(params.cursor);

  const conditions: SQL[] = [eq(driverLicences.profile_id, userId)];

  if (filters.surname !== undefined) {
    const escaped = filters.surname.replace(/%/g, '\\%').replace(/_/g, '\\_');
    conditions.push(ilike(driverLicences.surname, `%${escaped}%`));
  }

  if (filters.id_number !== undefined) {
    conditions.push(eq(driverLicences.id_number, filters.id_number));
  }

  if (cursor) {
    const cursorCondition = or(
      lt(driverLicences.created_at, new Date(cursor.created_at)),
      and(eq(driverLicences.created_at, new Date(cursor.created_at)), lt(driverLicences.id, cursor.id)),
    );
    if (cursorCondition) {
      conditions.push(cursorCondition);
    }
  }

  const orderClauses = [];
  if (filters.sort_by) {
    const col = driverLicences[filters.sort_by as keyof typeof driverLicences.$inferSelect];
    orderClauses.push(filters.sort_order === 'asc' ? asc(col as unknown as SQL) : desc(col as unknown as SQL));
  }
  orderClauses.push(desc(driverLicences.created_at), desc(driverLicences.id));

  const data = await db
    .select()
    .from(driverLicences)
    .where(and(...conditions))
    .orderBy(...orderClauses)
    .limit(params.limit);

  const items = data.map((row) => mapToDriverLicence(row));
  const pagination = PaginationUtil.buildPagination(items, params.limit);

  return { items, pagination };
}

export async function getDriverLicenceById(licenceId: string, userId: string): Promise<IDriverLicence> {
  const data = await db
    .select()
    .from(driverLicences)
    .where(and(eq(driverLicences.id, licenceId), eq(driverLicences.profile_id, userId)))
    .then((rows) => rows.at(0));

  if (!data) {
    Logger.warn(CONTEXT, `Driver licence not found (licenceId: ${licenceId}, userId: ${userId})`);
    throw new HttpError(HTTP_STATUS.NOT_FOUND, 'Driver licence not found');
  }

  return mapToDriverLicence(data);
}

export async function createDriverLicence(data: ICreateDriverLicenceData): Promise<IDriverLicence> {
  try {
    const licence = await db
      .insert(driverLicences)
      .values({
        profile_id: data.profile_id,
        surname: data.surname,
        initials: data.initials,
        id_number: data.id_number,
        expiry_date: data.expiry_date,
        licence_number: data.licence_number,
        licence_codes: data.licence_codes,
        issue_date: data.issue_date,
        date_of_birth: data.date_of_birth,
        gender: data.gender,
        decoded_data: data.decoded_data,
      })
      .returning()
      .then((rows) => rows.at(0));

    if (!licence) {
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to create driver licence');
    }

    return mapToDriverLicence(licence);
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
    const { cause } = (error as { cause?: { code?: string } });
    const errorCode = cause?.code ?? (error as { code?: string }).code;
    if (errorCode === '23505') {
      throw new HttpError(HTTP_STATUS.CONFLICT, 'Driver licence with this ID number already');
    }
    throw error;
  }
}

export async function updateDriverLicence(data: IUpdateDriverLicenceData): Promise<IDriverLicence> {
  const existing = await db
    .select({ id: driverLicences.id })
    .from(driverLicences)
    .where(and(eq(driverLicences.id, data.id), eq(driverLicences.profile_id, data.profile_id)))
    .then((rows) => rows.at(0));

  if (!existing) {
    Logger.warn(CONTEXT, `Driver licence not found for update (licenceId: ${data.id}, userId: ${data.profile_id})`);
    throw new HttpError(HTTP_STATUS.NOT_FOUND, 'Driver licence not found');
  }

  const updateData = buildPartialUpdate(data, [
    'surname',
    'initials',
    'id_number',
    'expiry_date',
    'licence_number',
    'licence_codes',
    'issue_date',
    'date_of_birth',
    'gender',
    'decoded_data',
  ]);

  try {
    const licence = await db
      .update(driverLicences)
      .set(updateData)
      .where(and(eq(driverLicences.id, data.id), eq(driverLicences.profile_id, data.profile_id)))
      .returning()
      .then((rows) => rows.at(0));

    if (!licence) {
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to update driver licence');
    }

    return mapToDriverLicence(licence);
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
    const { cause } = (error as { cause?: { code?: string } });
    const errorCode = cause?.code ?? (error as { code?: string }).code;
    if (errorCode === '23505') {
      throw new HttpError(HTTP_STATUS.CONFLICT, 'Driver licence with this ID number already exists for another user');
    }
    throw error;
  }
}

export async function deleteDriverLicence(licenceId: string, userId: string): Promise<void> {
  const existing = await db
    .select({ id: driverLicences.id })
    .from(driverLicences)
    .where(and(eq(driverLicences.id, licenceId), eq(driverLicences.profile_id, userId)))
    .then((rows) => rows.at(0));

  if (!existing) {
    Logger.warn(CONTEXT, `Driver licence not found for deletion (licenceId: ${licenceId}, userId: ${userId})`);
    throw new HttpError(HTTP_STATUS.NOT_FOUND, 'Driver licence not found');
  }

  await db
    .delete(driverLicences)
    .where(and(eq(driverLicences.id, licenceId), eq(driverLicences.profile_id, userId)));
}

function mapToDriverLicence(row: typeof driverLicences.$inferSelect): IDriverLicence {
  return {
    id: row.id,
    profile_id: row.profile_id,
    surname: row.surname,
    initials: row.initials,
    id_number: row.id_number,
    expiry_date: row.expiry_date,
    licence_number: row.licence_number,
    licence_codes: row.licence_codes,
    issue_date: row.issue_date,
    date_of_birth: row.date_of_birth,
    gender: row.gender,
    decoded_data: row.decoded_data,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}
