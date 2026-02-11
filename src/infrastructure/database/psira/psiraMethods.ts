import type { IPsiraApiRequest, IPsiraApiResponse, IPsiraResult, IPsiraOfficer, ICreatePsiraOfficerRequest, IPsiraFilters } from './types.js';
import db from '../drizzleClient.js';
import { psiraOfficers } from '../schema/index.js';
import { eq, or, lt, and, desc, asc, ilike, type SQL } from 'drizzle-orm';
import { HttpError } from '../../../shared/types/errors/appError.js';
import { HTTP_STATUS } from '../../../shared/constants/httpStatus.js';
import { Logger } from '../../../shared/utils/logging/logger.js';
import { PaginationUtil, type ICursorParams, type IPaginatedResult } from '../../../shared/utils/pagination.js';

const PSIRA_API_URL = 'https://psiraapi.sortelearn.com/api/SecurityOfficer/Get_ApplicantDetails';

const PSIRA_API_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json, text/plain, */*',
  'Origin': 'https://digitalservices.psira.co.za',
  'Referer': 'https://digitalservices.psira.co.za/',
  'skip': 'true',
} as const;

export default class PsiraService {
  private static async fetchFromPsiraApi(
    payload: IPsiraApiRequest,
    logContext: string,
  ): Promise<IPsiraResult[]> {
    const response = await fetch(PSIRA_API_URL, {
      method: 'POST',
      headers: PSIRA_API_HEADERS,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      Logger.error(`PSIRA API request failed (${logContext})`, 'PSIRA_SERVICE', {
        status: response.status,
        statusText: response.statusText,
      });
      throw new HttpError(
        HTTP_STATUS.BAD_GATEWAY,
        'Failed to fetch data from PSIRA API',
      );
    }

    const data = await response.json() as IPsiraApiResponse;

    if (data.Table.length === 0) {
      return [];
    }

    return data.Table.map((item) => ({
      FirstName: item.FirstName,
      LastName: item.LastName,
      Gender: item.Gender,
      RequestStatus: item.RequestStatus,
      SIRANo: item.SIRANo,
      ExpiryDate: item.ExpiryDate,
    }));
  }

  public static async getApplicantDetails(idNumber: string): Promise<IPsiraResult[]> {
    const payload: IPsiraApiRequest = {
      ApplicationNo: '',
      ContactNo: null,
      IDNumber: idNumber,
      SIRANo: '',
      CompanyName: '',
      ProfileId: '4',
    };

    try {
      return await this.fetchFromPsiraApi(payload, 'ID lookup');
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }

      Logger.error('PSIRA API request error', 'PSIRA_SERVICE', { error });
      throw new HttpError(
        HTTP_STATUS.BAD_GATEWAY,
        'Failed to connect to PSIRA API',
      );
    }
  }

  public static async getOfficersByUserId(
    userId: string,
    params: ICursorParams,
    filters: IPsiraFilters = {},
  ): Promise<IPaginatedResult<IPsiraOfficer>> {
    try {
      const cursor = PaginationUtil.decodeCursor(params.cursor);

      const conditions: SQL[] = [eq(psiraOfficers.profile_id, userId)];

      if (filters.id_number) {
        conditions.push(ilike(psiraOfficers.id_number, filters.id_number));
      }

      if (cursor) {
        const cursorCondition = or(
          lt(psiraOfficers.created_at, new Date(cursor.created_at)),
          and(eq(psiraOfficers.created_at, new Date(cursor.created_at)), lt(psiraOfficers.id, cursor.id)),
        );
        if (cursorCondition) {
          conditions.push(cursorCondition);
        }
      }

      const orderClauses = [];
      if (filters.sort_by) {
        const col = psiraOfficers[filters.sort_by as keyof typeof psiraOfficers.$inferSelect];
        orderClauses.push(filters.sort_order === 'asc' ? asc(col as unknown as SQL) : desc(col as unknown as SQL));
      }
      orderClauses.push(desc(psiraOfficers.created_at), desc(psiraOfficers.id));

      const data = await db
        .select()
        .from(psiraOfficers)
        .where(and(...conditions))
        .orderBy(...orderClauses)
        .limit(params.limit);

      const items = data.map((row) => PsiraService.mapToOfficer(row));
      const pagination = PaginationUtil.buildPagination(items, params.limit);

      return { items, pagination };
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      Logger.error('Failed to fetch officers', 'PSIRA_SERVICE', { error });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to fetch officers');
    }
  }

  public static async createOfficer(
    data: ICreatePsiraOfficerRequest,
    userId: string,
  ): Promise<IPsiraOfficer> {
    try {
      const [officer] = await db
        .insert(psiraOfficers)
        .values({
          profile_id: userId,
          id_number: data.IDNumber,
          first_name: data.FirstName,
          last_name: data.LastName,
          gender: data.Gender,
          request_status: data.RequestStatus,
          sira_no: data.SIRANo,
          expiry_date: data.ExpiryDate,
        })
        .returning();

      if (!officer) {
        throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to create officer');
      }

      return PsiraService.mapToOfficer(officer);
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      const cause = (error as Record<string, unknown>).cause as Record<string, unknown> | undefined;
      if (cause?.code === '23505' || (error as Record<string, unknown>).code === '23505') {
        throw new HttpError(HTTP_STATUS.CONFLICT, 'Officer with this ID number already exists');
      }
      Logger.error('Failed to create officer', 'PSIRA_SERVICE', { error });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to create officer');
    }
  }

  public static async deleteOfficer(officerId: string, userId: string): Promise<void> {
    try {
      const [deleted] = await db
        .delete(psiraOfficers)
        .where(and(eq(psiraOfficers.id, officerId), eq(psiraOfficers.profile_id, userId)))
        .returning();

      if (!deleted) {
        throw new HttpError(HTTP_STATUS.NOT_FOUND, 'Officer not found');
      }
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      Logger.error('Failed to delete officer', 'PSIRA_SERVICE', { error });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to delete officer');
    }
  }

  public static async getApplicantDetailsBySiraNo(siraNo: string): Promise<IPsiraResult[]> {
    const payload: IPsiraApiRequest = {
      ApplicationNo: '',
      ContactNo: null,
      IDNumber: '',
      SIRANo: siraNo,
      CompanyName: '',
      ProfileId: '4',
    };

    try {
      return await this.fetchFromPsiraApi(payload, 'SIRA lookup');
    } catch (error) {
      Logger.error('PSIRA API request error (SIRA lookup)', 'PSIRA_SERVICE', { error });
      throw error;
    }
  }

  public static async getExpiredOfficers(): Promise<IPsiraOfficer[]> {
    try {
      const todayStr = new Date().toISOString().split('T')[0] ?? '';

      const data = await db
        .select()
        .from(psiraOfficers)
        .where(lt(psiraOfficers.expiry_date, todayStr));

      return data.map((row) => PsiraService.mapToOfficer(row));
    } catch (error) {
      Logger.error('Failed to fetch officers for expiry check', 'PSIRA_SERVICE', { error });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to fetch officers');
    }
  }

  public static async updateOfficerFromApi(
    officerId: string,
    updates: { expiry_date: string; request_status: string },
  ): Promise<void> {
    try {
      await db
        .update(psiraOfficers)
        .set({
          expiry_date: updates.expiry_date,
          request_status: updates.request_status,
        })
        .where(eq(psiraOfficers.id, officerId));
    } catch (error) {
      Logger.error('Failed to update officer', 'PSIRA_SERVICE', { error, officerId });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to update officer');
    }
  }

  private static mapToOfficer(row: typeof psiraOfficers.$inferSelect): IPsiraOfficer {
    return {
      id: row.id,
      profile_id: row.profile_id,
      id_number: row.id_number,
      first_name: row.first_name,
      last_name: row.last_name,
      gender: row.gender ?? '',
      request_status: row.request_status ?? '',
      sira_no: row.sira_no ?? '',
      expiry_date: row.expiry_date,
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString(),
    };
  }
}
