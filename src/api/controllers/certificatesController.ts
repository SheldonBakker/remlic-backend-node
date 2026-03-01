import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../../shared/types/request';
import { ResponseUtil } from '../../shared/utils/response';
import { HTTP_STATUS } from '../../shared/constants/httpStatus';
import { requireUser } from '../../shared/utils/authHelpers';
import {
  getCertificatesByUserId,
  getCertificateById,
  createCertificate,
  updateCertificate,
  deleteCertificate,
} from '../../infrastructure/database/certificates/certificatesMethods';
import { CertificatesValidation } from '../../infrastructure/database/certificates/validation';
import { PaginationUtil } from '../../shared/utils/pagination';

export const list = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: userId } = requireUser(req);
    if (typeof req.query.id === 'string') {
      const certificateId = CertificatesValidation.validateCertificateId(req.query.id);
      const certificate = await getCertificateById(certificateId, userId);
      ResponseUtil.success(res, { certificate }, HTTP_STATUS.OK);
      return;
    }
    const params = PaginationUtil.parseQuery(req.query);
    const filters = CertificatesValidation.validateFilters(req.query);
    const { items, pagination } = await getCertificatesByUserId(userId, params, filters);
    ResponseUtil.success(res, { certificates: items }, HTTP_STATUS.OK, pagination);
  } catch (error) {
    next(error);
  }
};

export const create = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: userId } = requireUser(req);
    const validatedData = CertificatesValidation.validateCreateCertificate(req.body);
    const certificate = await createCertificate({ ...validatedData, profile_id: userId });
    ResponseUtil.success(res, { certificate }, HTTP_STATUS.CREATED);
  } catch (error) {
    next(error);
  }
};

export const update = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: userId } = requireUser(req);
    const certificateId = CertificatesValidation.validateCertificateId(req.params.id);
    const validatedData = CertificatesValidation.validateUpdateCertificate(req.body);
    const certificate = await updateCertificate({ ...validatedData, id: certificateId, profile_id: userId });
    ResponseUtil.success(res, { certificate }, HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};

export const remove = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: userId } = requireUser(req);
    const certificateId = CertificatesValidation.validateCertificateId(req.params.id);
    await deleteCertificate(certificateId, userId);
    ResponseUtil.success(res, { message: 'Certificate deleted successfully' }, HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};
