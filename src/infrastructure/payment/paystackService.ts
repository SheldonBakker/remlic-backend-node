import { createHmac } from 'crypto';
import { config } from '../config/env.config.js';
import { Logger } from '../../shared/utils/logging/logger.js';
import type {
  IPaystackInitializeRequest,
  IPaystackInitializeResponse,
  IPaystackVerifyResponse,
  IPaystackSubscriptionResponse,
  IPaystackDisableSubscriptionResponse,
  IPaystackRefundRequest,
  IPaystackRefundResponse,
  IPaystackRefundData,
  IPaystackResult,
  IPaystackTransactionData,
  IPaystackVerifyData,
  IPaystackSubscriptionData,
} from './types.js';

interface IPaystackErrorResponse {
  status: boolean;
  message?: string;
}

class PaystackService {
  private static getHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${config.paystack.secretKey}`,
      'Content-Type': 'application/json',
    };
  }

  private static async parseErrorResponse(response: Response): Promise<string> {
    const errorData = (await response.json().catch(() => ({}))) as IPaystackErrorResponse;
    return errorData.message ?? `HTTP ${response.status}`;
  }

  public static async initializeTransaction(
    request: IPaystackInitializeRequest,
  ): Promise<IPaystackResult<IPaystackTransactionData>> {
    try {
      const response = await fetch(`${config.paystack.baseUrl}/transaction/initialize`, {
        method: 'POST',
        headers: PaystackService.getHeaders(),
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorMessage = await PaystackService.parseErrorResponse(response);
        Logger.error(`Paystack initialization error: ${errorMessage}`, 'PAYSTACK_SERVICE');
        return { success: false, error: errorMessage };
      }

      const result = (await response.json()) as IPaystackInitializeResponse;
      return { success: true, data: result.data };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Logger.error(`Failed to initialize transaction: ${errorMessage}`, 'PAYSTACK_SERVICE');
      return { success: false, error: errorMessage };
    }
  }

  public static async verifyTransaction(
    reference: string,
  ): Promise<IPaystackResult<IPaystackVerifyData>> {
    try {
      const response = await fetch(
        `${config.paystack.baseUrl}/transaction/verify/${encodeURIComponent(reference)}`,
        {
          method: 'GET',
          headers: PaystackService.getHeaders(),
        },
      );

      if (!response.ok) {
        const errorMessage = await PaystackService.parseErrorResponse(response);
        Logger.error(`Paystack verification error: ${errorMessage}`, 'PAYSTACK_SERVICE');
        return { success: false, error: errorMessage };
      }

      const result = (await response.json()) as IPaystackVerifyResponse;
      return { success: true, data: result.data };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Logger.error(`Failed to verify transaction: ${errorMessage}`, 'PAYSTACK_SERVICE');
      return { success: false, error: errorMessage };
    }
  }

  public static async getSubscription(
    subscriptionCode: string,
  ): Promise<IPaystackResult<IPaystackSubscriptionData>> {
    try {
      const response = await fetch(
        `${config.paystack.baseUrl}/subscription/${encodeURIComponent(subscriptionCode)}`,
        {
          method: 'GET',
          headers: PaystackService.getHeaders(),
        },
      );

      if (!response.ok) {
        const errorMessage = await PaystackService.parseErrorResponse(response);
        Logger.error(`Failed to fetch subscription: ${errorMessage}`, 'PAYSTACK_SERVICE');
        return { success: false, error: errorMessage };
      }

      const result = (await response.json()) as IPaystackSubscriptionResponse;
      return { success: true, data: result.data };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Logger.error(`Failed to fetch subscription: ${errorMessage}`, 'PAYSTACK_SERVICE');
      return { success: false, error: errorMessage };
    }
  }

  public static async disableSubscription(
    subscriptionCode: string,
    emailToken: string,
  ): Promise<IPaystackResult<void>> {
    try {
      const response = await fetch(`${config.paystack.baseUrl}/subscription/disable`, {
        method: 'POST',
        headers: PaystackService.getHeaders(),
        body: JSON.stringify({
          code: subscriptionCode,
          token: emailToken,
        }),
      });

      if (!response.ok) {
        const errorMessage = await PaystackService.parseErrorResponse(response);
        Logger.error(`Failed to disable subscription: ${errorMessage}`, 'PAYSTACK_SERVICE');
        return { success: false, error: errorMessage };
      }

      const result = (await response.json()) as IPaystackDisableSubscriptionResponse;
      return { success: result.status };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Logger.error(`Failed to disable subscription: ${errorMessage}`, 'PAYSTACK_SERVICE');
      return { success: false, error: errorMessage };
    }
  }

  public static verifyWebhookSignature(payload: string, signature: string): boolean {
    const hash = createHmac('sha512', config.paystack.secretKey)
      .update(payload)
      .digest('hex');
    return hash === signature;
  }

  public static async createRefund(
    request: IPaystackRefundRequest,
  ): Promise<IPaystackResult<IPaystackRefundData>> {
    try {
      const response = await fetch(`${config.paystack.baseUrl}/refund`, {
        method: 'POST',
        headers: PaystackService.getHeaders(),
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorMessage = await PaystackService.parseErrorResponse(response);
        Logger.error(`Paystack refund error: ${errorMessage}`, 'PAYSTACK_SERVICE');
        return { success: false, error: errorMessage };
      }

      const result = (await response.json()) as IPaystackRefundResponse;
      return { success: true, data: result.data };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Logger.error(`Failed to create refund: ${errorMessage}`, 'PAYSTACK_SERVICE');
      return { success: false, error: errorMessage };
    }
  }
}

export { PaystackService };
