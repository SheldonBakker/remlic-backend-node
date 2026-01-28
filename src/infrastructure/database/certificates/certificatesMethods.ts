import type { ICertificate, ICreateCertificateData, IUpdateCertificateData, ICertificatesFilters } from './types.js';
import { supabaseAdmin } from '../supabaseClient.js';
import { HttpError } from '../../../shared/types/errors/appError.js';
import { HTTP_STATUS } from '../../../shared/constants/httpStatus.js';
import { Logger } from '../../../shared/utils/logger.js';
import { PaginationUtil, type ICursorParams, type IPaginatedResult } from '../../../shared/utils/pagination.js';
import { buildPartialUpdate } from '../../../shared/utils/updateBuilder.js';

export default class CertificatesService {
  public static async getCertificatesByUserId(
    userId: string,
    params: ICursorParams,
    filters: ICertificatesFilters = {},
  ): Promise<IPaginatedResult<ICertificate>> {
    const cursor = PaginationUtil.decodeCursor(params.cursor);

    let query = supabaseAdmin
      .from('certificates')
      .select('*')
      .eq('profile_id', userId);

    if (filters.certificate_number) {
      query = query.ilike('certificate_number', filters.certificate_number);
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
      Logger.error('Failed to fetch certificates', 'CERTIFICATES_SERVICE', { error: error.message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to fetch certificates');
    }

    const items = data as ICertificate[];
    const pagination = PaginationUtil.buildPagination(items, params.limit);

    return { items, pagination };
  }

  public static async getCertificateById(certificateId: string, userId: string): Promise<ICertificate> {
    const { data, error } = await supabaseAdmin
      .from('certificates')
      .select('*')
      .eq('id', certificateId)
      .eq('profile_id', userId)
      .single();

    if (error || !data) {
      Logger.warn('Certificate not found', 'CERTIFICATES_SERVICE', { certificateId, userId });
      throw new HttpError(HTTP_STATUS.NOT_FOUND, 'Certificate not found');
    }

    return data as ICertificate;
  }

  public static async createCertificate(data: ICreateCertificateData): Promise<ICertificate> {
    const { data: certificate, error } = await supabaseAdmin
      .from('certificates')
      .insert({
        profile_id: data.profile_id,
        type: data.type,
        first_name: data.first_name,
        last_name: data.last_name,
        certificate_number: data.certificate_number,
        expiry_date: data.expiry_date,
      })
      .select()
      .single();

    if (error) {
      Logger.error('Failed to create certificate', 'CERTIFICATES_SERVICE', { error: error.message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to create certificate');
    }

    return certificate as ICertificate;
  }

  public static async updateCertificate(data: IUpdateCertificateData): Promise<ICertificate> {
    const { error: findError } = await supabaseAdmin
      .from('certificates')
      .select('id')
      .eq('id', data.id)
      .eq('profile_id', data.profile_id)
      .single();

    if (findError) {
      Logger.warn('Certificate not found for update', 'CERTIFICATES_SERVICE', { certificateId: data.id, userId: data.profile_id });
      throw new HttpError(HTTP_STATUS.NOT_FOUND, 'Certificate not found');
    }

    const updateData = buildPartialUpdate(data, ['type', 'first_name', 'last_name', 'certificate_number', 'expiry_date']);

    const { data: certificate, error: updateError } = await supabaseAdmin
      .from('certificates')
      .update(updateData)
      .eq('id', data.id)
      .eq('profile_id', data.profile_id)
      .select()
      .single();

    if (updateError) {
      Logger.error('Failed to update certificate', 'CERTIFICATES_SERVICE', { error: updateError.message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to update certificate');
    }

    return certificate as ICertificate;
  }

  public static async deleteCertificate(certificateId: string, userId: string): Promise<void> {
    const { error: findError } = await supabaseAdmin
      .from('certificates')
      .select('id')
      .eq('id', certificateId)
      .eq('profile_id', userId)
      .single();

    if (findError) {
      Logger.warn('Certificate not found for deletion', 'CERTIFICATES_SERVICE', { certificateId, userId });
      throw new HttpError(HTTP_STATUS.NOT_FOUND, 'Certificate not found');
    }

    const { error: deleteError } = await supabaseAdmin
      .from('certificates')
      .delete()
      .eq('id', certificateId)
      .eq('profile_id', userId);

    if (deleteError) {
      Logger.error('Failed to delete certificate', 'CERTIFICATES_SERVICE', { error: deleteError.message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to delete certificate');
    }
  }
}
