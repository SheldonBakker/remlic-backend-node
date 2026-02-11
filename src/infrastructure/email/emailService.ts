import { randomUUID } from 'crypto';
import { config } from '../config/env.config.js';
import { Logger } from '../../shared/utils/logging/logger.js';
import type { IKlaviyoEventOptions, IEmailResult, IBulkEventItem } from './types.js';

const KLAVIYO_API_BASE = 'https://a.klaviyo.com/api';

const ENTITY_TYPE_LABELS: Record<string, string> = {
  firearms: 'Firearm License',
  vehicles: 'Vehicle License',
  certificates: 'Certificate',
  psira_officers: 'PSIRA Registration',
};

interface IKlaviyoEventPayload {
  data: {
    type: 'event';
    attributes: {
      metric: {
        data: {
          type: 'metric';
          attributes: { name: string };
        };
      };
      profile: {
        data: {
          type: 'profile';
          attributes: {
            email: string;
            first_name?: string;
            last_name?: string;
            phone_number?: string;
          };
        };
      };
      properties: Record<string, unknown>;
      unique_id?: string;
      time: string;
      value?: number;
    };
  };
}

interface IKlaviyoErrorResponse {
  errors?: Array<{ detail?: string }>;
}

class EmailService {
  private static getHeaders(): Record<string, string> {
    return {
      Authorization: `Klaviyo-API-Key ${config.email.apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      revision: config.email.apiRevision,
    };
  }

  private static async parseErrorResponse(response: Response): Promise<string> {
    const errorData = (await response.json().catch(() => ({}))) as IKlaviyoErrorResponse;
    return errorData.errors?.[0]?.detail ?? `HTTP ${response.status}`;
  }

  private static buildEventPayload(options: IKlaviyoEventOptions): IKlaviyoEventPayload {
    return {
      data: {
        type: 'event',
        attributes: {
          metric: {
            data: {
              type: 'metric',
              attributes: { name: options.metricName },
            },
          },
          profile: {
            data: {
              type: 'profile',
              attributes: {
                email: options.profile.email,
                first_name: options.profile.firstName,
                last_name: options.profile.lastName,
                phone_number: options.profile.phoneNumber,
              },
            },
          },
          properties: options.properties,
          unique_id: options.uniqueId,
          time: options.time ?? new Date().toISOString(),
          value: options.value,
        },
      },
    };
  }

  public static async createEvent(options: IKlaviyoEventOptions): Promise<IEmailResult> {
    try {
      const response = await fetch(`${KLAVIYO_API_BASE}/events`, {
        method: 'POST',
        headers: EmailService.getHeaders(),
        body: JSON.stringify(EmailService.buildEventPayload(options)),
      });

      if (!response.ok) {
        const errorMessage = await EmailService.parseErrorResponse(response);
        Logger.error(`Klaviyo API error: ${errorMessage}`, 'EMAIL_SERVICE');
        return { success: false, error: errorMessage };
      }

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Logger.error(`Failed to create event: ${errorMessage}`, 'EMAIL_SERVICE');
      return { success: false, error: errorMessage };
    }
  }

  public static async sendContactFormEvent(data: {
    email: string;
    subject: string;
    message: string;
  }): Promise<IEmailResult> {
    return EmailService.createEvent({
      metricName: 'Contact Form Submitted',
      profile: { email: config.email.supportEmail },
      properties: {
        sender_email: data.email,
        subject: data.subject,
        message: data.message,
        submittedAt: new Date().toISOString(),
      },
      uniqueId: `contact-${Date.now()}-${randomUUID().substring(0, 8)}`,
    });
  }

  private static buildBulkEventData(item: IBulkEventItem): object {
    return {
      type: 'event',
      attributes: {
        metric: {
          data: {
            type: 'metric',
            attributes: { name: 'License Expiring' },
          },
        },
        properties: {
          entity_type: item.entityType,
          entity_type_label: ENTITY_TYPE_LABELS[item.entityType] ?? item.entityType,
          item_name: item.itemName,
          expiry_date: item.expiryDate,
          days_until_expiry: item.daysUntilExpiry,
          ...item.details,
        },
        unique_id: item.uniqueId,
        time: new Date().toISOString(),
      },
    };
  }

  private static buildBulkPayload(itemsByEmail: Map<string, IBulkEventItem[]>): object {
    return {
      data: {
        type: 'event-bulk-create-job',
        attributes: {
          'events-bulk-create': {
            data: Array.from(itemsByEmail.entries()).map(([email, profileItems]) => ({
              type: 'event-bulk-create',
              attributes: {
                profile: {
                  data: {
                    type: 'profile',
                    attributes: { email },
                  },
                },
                events: {
                  data: profileItems.map((item) => EmailService.buildBulkEventData(item)),
                },
              },
            })),
          },
        },
      },
    };
  }

  public static async createBulkEvents(items: IBulkEventItem[]): Promise<IEmailResult> {
    if (items.length === 0) {
      return { success: true };
    }

    try {
      const itemsByEmail = new Map<string, IBulkEventItem[]>();
      for (const item of items) {
        const existing = itemsByEmail.get(item.email) ?? [];
        existing.push(item);
        itemsByEmail.set(item.email, existing);
      }

      const payload = EmailService.buildBulkPayload(itemsByEmail);

      const response = await fetch(`${KLAVIYO_API_BASE}/event-bulk-create-jobs`, {
        method: 'POST',
        headers: EmailService.getHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorMessage = await EmailService.parseErrorResponse(response);
        Logger.error(`Bulk API error: ${errorMessage}`, 'EMAIL_SERVICE');
        return { success: false, error: errorMessage };
      }

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Logger.error(`Failed to create bulk events: ${errorMessage}`, 'EMAIL_SERVICE');
      return { success: false, error: errorMessage };
    }
  }
}

export { EmailService };
