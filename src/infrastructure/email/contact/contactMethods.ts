import type { IContactForm } from './types.js';
import { HttpError } from '../../../shared/types/errors/appError.js';
import { HTTP_STATUS } from '../../../shared/constants/httpStatus.js';
import { Logger } from '../../../shared/utils/logging/logger.js';
import { EmailService } from '../emailService.js';

export default class ContactService {
  public static async sendContactForm(data: IContactForm): Promise<{ message: string }> {
    const result = await EmailService.sendContactFormEvent({
      email: data.email,
      subject: data.subject,
      message: data.message,
    });

    if (!result.success) {
      Logger.error(`Failed to send contact form event: ${result.error}`, 'CONTACT_SERVICE');
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to send message. Please try again later.');
    }

    return { message: 'Your message has been sent successfully.' };
  }
}
