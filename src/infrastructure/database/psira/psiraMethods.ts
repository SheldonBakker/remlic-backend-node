import type { IPsiraApiRequest, IPsiraApiResponse, IPsiraResult, IPsiraOfficer, ICreatePsiraOfficerRequest, IPsiraFilters } from './types.js';
import { HttpError } from '../../../shared/types/errors/appError.js';
import { HTTP_STATUS } from '../../../shared/constants/httpStatus.js';
import { Logger } from '../../../shared/utils/logger.js';
import { supabase } from '../supabaseClient.js';
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
    const cursor = PaginationUtil.decodeCursor(params.cursor);

    let query = supabase
      .from('psira_officers')
      .select('*')
      .eq('profile_id', userId);

    if (filters.id_number) {
      query = query.ilike('id_number', filters.id_number);
    }

    if (filters.sort_by) {
      const ascending = filters.sort_order === 'asc';
      query = query.order(filters.sort_by, { ascending });
    }

    query = query
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(params.limit);

    if (cursor) {
      query = query.or(`created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`);
    }

    const { data, error } = await query;

    if (error) {
      Logger.error('Failed to fetch officers', 'PSIRA_SERVICE', { error });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to fetch officers');
    }

    const items = data as IPsiraOfficer[];
    const pagination = PaginationUtil.buildPagination(items, params.limit);

    return { items, pagination };
  }

  public static async createOfficer(
    data: ICreatePsiraOfficerRequest,
    userId: string,
  ): Promise<IPsiraOfficer> {
    const { data: officer, error } = await supabase
      .from('psira_officers')
      .insert({
        profile_id: userId,
        id_number: data.IDNumber,
        first_name: data.FirstName,
        last_name: data.LastName,
        gender: data.Gender,
        request_status: data.RequestStatus,
        sira_no: data.SIRANo,
        expiry_date: data.ExpiryDate,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new HttpError(HTTP_STATUS.CONFLICT, 'Officer with this ID number already exists');
      }
      Logger.error('Failed to create officer', 'PSIRA_SERVICE', { error });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to create officer');
    }

    return officer as IPsiraOfficer;
  }

  public static async deleteOfficer(officerId: string, userId: string): Promise<void> {
    const { data, error } = await supabase
      .from('psira_officers')
      .delete()
      .eq('id', officerId)
      .eq('profile_id', userId)
      .select()
      .single();

    if (error || !data) {
      throw new HttpError(HTTP_STATUS.NOT_FOUND, 'Officer not found');
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
    const { data, error } = await supabase
      .from('psira_officers')
      .select('*');

    if (error) {
      Logger.error('Failed to fetch officers for expiry check', 'PSIRA_SERVICE', { error });
      throw new Error('Failed to fetch officers');
    }

    const officers = data as IPsiraOfficer[];
    const now = new Date();

    return officers.filter((officer) => {
      const expiryDate = new Date(officer.expiry_date);
      return !isNaN(expiryDate.getTime()) && expiryDate < now;
    });
  }

  public static async updateOfficerFromApi(
    officerId: string,
    updates: { expiry_date: string; request_status: string },
  ): Promise<void> {
    const { error } = await supabase
      .from('psira_officers')
      .update({
        expiry_date: updates.expiry_date,
        request_status: updates.request_status,
      })
      .eq('id', officerId);

    if (error) {
      Logger.error('Failed to update officer', 'PSIRA_SERVICE', { error, officerId });
      throw new Error('Failed to update officer');
    }
  }
}
