import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../../shared/types/request.js';
import { ResponseUtil } from '../../shared/utils/response.js';
import { HTTP_STATUS } from '../../shared/constants/httpStatus.js';
import { HttpError } from '../../shared/types/errors/appError.js';
import CertificatesService from '../../infrastructure/database/certificates/certificatesMethods.js';
import { CertificatesValidation } from '../../infrastructure/database/certificates/validation.js';
import { PaginationUtil } from '../../shared/utils/pagination.js';

export default class CertificatesController {
  public static getCertificates = async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      throw new HttpError(HTTP_STATUS.UNAUTHORIZED, 'User not authenticated');
    }

    const params = PaginationUtil.parseQuery(req.query);
    const filters = CertificatesValidation.validateFilters(req.query);
    const { items, pagination } = await CertificatesService.getCertificatesByUserId(userId, params, filters);
    ResponseUtil.success(res, { certificates: items }, HTTP_STATUS.OK, pagination);
  };

  public static getCertificateById = async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      throw new HttpError(HTTP_STATUS.UNAUTHORIZED, 'User not authenticated');
    }

    const certificateId = CertificatesValidation.validateCertificateId(req.params.id);
    const certificate = await CertificatesService.getCertificateById(certificateId, userId);
    ResponseUtil.success(res, { certificate }, HTTP_STATUS.OK);
  };

  public static createCertificate = async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      throw new HttpError(HTTP_STATUS.UNAUTHORIZED, 'User not authenticated');
    }

    const validatedData = CertificatesValidation.validateCreateCertificate(req.body);
    const certificate = await CertificatesService.createCertificate({
      ...validatedData,
      profile_id: userId,
    });
    ResponseUtil.success(res, { certificate }, HTTP_STATUS.CREATED);
  };

  public static updateCertificate = async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      throw new HttpError(HTTP_STATUS.UNAUTHORIZED, 'User not authenticated');
    }

    const certificateId = CertificatesValidation.validateCertificateId(req.params.id);
    const validatedData = CertificatesValidation.validateUpdateCertificate(req.body);
    const certificate = await CertificatesService.updateCertificate({
      ...validatedData,
      id: certificateId,
      profile_id: userId,
    });
    ResponseUtil.success(res, { certificate }, HTTP_STATUS.OK);
  };

  public static deleteCertificate = async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      throw new HttpError(HTTP_STATUS.UNAUTHORIZED, 'User not authenticated');
    }

    const certificateId = CertificatesValidation.validateCertificateId(req.params.id);
    await CertificatesService.deleteCertificate(certificateId, userId);
    ResponseUtil.success(res, { message: 'Certificate deleted successfully' }, HTTP_STATUS.OK);
  };
}
