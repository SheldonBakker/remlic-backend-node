import type { Request, Response, NextFunction } from 'express';
import { ResponseUtil } from '../../shared/utils/response';
import { HTTP_STATUS } from '../../shared/constants/httpStatus';
import { ContactValidation } from '../../infrastructure/email/contact/validation';
import ContactService from '../../infrastructure/email/contact/contactMethods';

export const send = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validatedData = ContactValidation.validateContactForm(req.body);
    const result = await ContactService.sendContactForm(validatedData);
    ResponseUtil.success(res, result, HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};
