import type { Request, Response, NextFunction } from 'express';
import { ResponseUtil } from '../../shared/utils/response.js';
import { HTTP_STATUS } from '../../shared/constants/httpStatus.js';
import { ContactValidation } from '../../infrastructure/email/contact/validation.js';
import ContactService from '../../infrastructure/email/contact/contactMethods.js';

export default class ContactController {
  public static sendContactForm = async (
    req: Request,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const validatedData = ContactValidation.validateContactForm(req.body);
    const result = await ContactService.sendContactForm(validatedData);

    ResponseUtil.success(res, result, HTTP_STATUS.OK);
  };
}
