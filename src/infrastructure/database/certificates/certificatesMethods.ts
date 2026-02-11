import type { ICertificate, ICreateCertificateData, IUpdateCertificateData, ICertificatesFilters } from './types.js';
import db from '../drizzleClient.js';
import { certificates } from '../schema/index.js';
import { eq, or, lt, and, desc, asc, ilike, type SQL } from 'drizzle-orm';
import { HttpError } from '../../../shared/types/errors/appError.js';
import { HTTP_STATUS } from '../../../shared/constants/httpStatus.js';
import { Logger } from '../../../shared/utils/logging/logger.js';
import { PaginationUtil, type ICursorParams, type IPaginatedResult } from '../../../shared/utils/pagination.js';
import { buildPartialUpdate } from '../../../shared/utils/updateBuilder.js';

export default class CertificatesService {
  public static async getCertificatesByUserId(
    userId: string,
    params: ICursorParams,
    filters: ICertificatesFilters = {},
  ): Promise<IPaginatedResult<ICertificate>> {
    try {
      const cursor = PaginationUtil.decodeCursor(params.cursor);

      const conditions: SQL[] = [eq(certificates.profile_id, userId)];

      if (filters.certificate_number) {
        conditions.push(ilike(certificates.certificate_number, filters.certificate_number));
      }

      if (cursor) {
        const cursorCondition = or(
          lt(certificates.created_at, new Date(cursor.created_at)),
          and(eq(certificates.created_at, new Date(cursor.created_at)), lt(certificates.id, cursor.id)),
        );
        if (cursorCondition) {
          conditions.push(cursorCondition);
        }
      }

      const orderClauses = [];
      if (filters.sort_by) {
        const col = certificates[filters.sort_by as keyof typeof certificates.$inferSelect];
        orderClauses.push(filters.sort_order === 'asc' ? asc(col as unknown as SQL) : desc(col as unknown as SQL));
      }
      orderClauses.push(desc(certificates.created_at), desc(certificates.id));

      const data = await db
        .select()
        .from(certificates)
        .where(and(...conditions))
        .orderBy(...orderClauses)
        .limit(params.limit);

      const items = data.map((row) => CertificatesService.mapToCertificate(row));
      const pagination = PaginationUtil.buildPagination(items, params.limit);

      return { items, pagination };
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      Logger.error('Failed to fetch certificates', 'CERTIFICATES_SERVICE', { error: (error as Error).message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to fetch certificates');
    }
  }

  public static async getCertificateById(certificateId: string, userId: string): Promise<ICertificate> {
    try {
      const [data] = await db
        .select()
        .from(certificates)
        .where(and(eq(certificates.id, certificateId), eq(certificates.profile_id, userId)));

      if (!data) {
        Logger.warn('Certificate not found', 'CERTIFICATES_SERVICE', { certificateId, userId });
        throw new HttpError(HTTP_STATUS.NOT_FOUND, 'Certificate not found');
      }

      return CertificatesService.mapToCertificate(data);
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      Logger.error('Failed to fetch certificate', 'CERTIFICATES_SERVICE', { error: (error as Error).message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to fetch certificate');
    }
  }

  public static async createCertificate(data: ICreateCertificateData): Promise<ICertificate> {
    try {
      const [certificate] = await db
        .insert(certificates)
        .values({
          profile_id: data.profile_id,
          type: data.type,
          first_name: data.first_name,
          last_name: data.last_name,
          certificate_number: data.certificate_number,
          expiry_date: data.expiry_date,
        })
        .returning();

      if (!certificate) {
        throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to create certificate');
      }

      return CertificatesService.mapToCertificate(certificate);
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      Logger.error('Failed to create certificate', 'CERTIFICATES_SERVICE', { error: (error as Error).message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to create certificate');
    }
  }

  public static async updateCertificate(data: IUpdateCertificateData): Promise<ICertificate> {
    try {
      const [existing] = await db
        .select({ id: certificates.id })
        .from(certificates)
        .where(and(eq(certificates.id, data.id), eq(certificates.profile_id, data.profile_id)));

      if (!existing) {
        Logger.warn('Certificate not found for update', 'CERTIFICATES_SERVICE', { certificateId: data.id, userId: data.profile_id });
        throw new HttpError(HTTP_STATUS.NOT_FOUND, 'Certificate not found');
      }

      const updateData = buildPartialUpdate(data, ['type', 'first_name', 'last_name', 'certificate_number', 'expiry_date']);

      const [certificate] = await db
        .update(certificates)
        .set(updateData)
        .where(and(eq(certificates.id, data.id), eq(certificates.profile_id, data.profile_id)))
        .returning();

      if (!certificate) {
        throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to update certificate');
      }

      return CertificatesService.mapToCertificate(certificate);
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      Logger.error('Failed to update certificate', 'CERTIFICATES_SERVICE', { error: (error as Error).message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to update certificate');
    }
  }

  public static async deleteCertificate(certificateId: string, userId: string): Promise<void> {
    try {
      const [existing] = await db
        .select({ id: certificates.id })
        .from(certificates)
        .where(and(eq(certificates.id, certificateId), eq(certificates.profile_id, userId)));

      if (!existing) {
        Logger.warn('Certificate not found for deletion', 'CERTIFICATES_SERVICE', { certificateId, userId });
        throw new HttpError(HTTP_STATUS.NOT_FOUND, 'Certificate not found');
      }

      await db
        .delete(certificates)
        .where(and(eq(certificates.id, certificateId), eq(certificates.profile_id, userId)));
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      Logger.error('Failed to delete certificate', 'CERTIFICATES_SERVICE', { error: (error as Error).message });
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to delete certificate');
    }
  }

  private static mapToCertificate(row: typeof certificates.$inferSelect): ICertificate {
    return {
      id: row.id,
      profile_id: row.profile_id,
      type: row.type,
      first_name: row.first_name,
      last_name: row.last_name,
      certificate_number: row.certificate_number,
      expiry_date: row.expiry_date,
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString(),
    };
  }
}
