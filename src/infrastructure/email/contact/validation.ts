import { z } from 'zod';
import { HttpError } from '../../../shared/types/errors/appError';
import { HTTP_STATUS } from '../../../shared/constants/httpStatus';
import type { IContactForm } from './types';

const contactFormSchema = z.object({
  email: z.string().email('Invalid email address'),
  subject: z.string().min(1, 'Subject is required').max(200, 'Subject must be less than 200 characters'),
  message: z.string().min(1, 'Message is required').max(5000, 'Message must be less than 5000 characters'),
});

export class ContactValidation {
  public static validateContactForm(data: unknown): IContactForm {
    const result = contactFormSchema.safeParse(data);
    if (!result.success) {
      const errorMessage = result.error.issues.map((e) => e.message).join(', ');
      throw new HttpError(HTTP_STATUS.BAD_REQUEST, errorMessage);
    }
    return result.data;
  }
}
