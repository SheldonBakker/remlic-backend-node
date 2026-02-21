import { z } from 'zod';
import { validateOrThrow } from '../../shared/utils/validationHelper.js';

export type DecryptType = 'drivers' | 'vehicle';

const decryptTypeSchema = z.enum(['drivers', 'vehicle']);

export interface IBarcodeDataRequest {
  barcodeData: string;
}

const barcodeDataSchema = z.object({
  barcodeData: z.string()
    .min(1, 'Barcode data is required')
    .refine(
      (val) => {
        try {
          Buffer.from(val, 'base64');
          return /^[A-Za-z0-9+/]+=*$/.test(val);
        } catch {
          return false;
        }
      },
      'Barcode data must be valid base64',
    ),
}).strict();

export class DecryptValidation {
  public static validateType(data: unknown): DecryptType {
    return validateOrThrow(decryptTypeSchema, data, 'Invalid type, must be "drivers" or "vehicle"');
  }

  public static validateBarcodeData(data: unknown): IBarcodeDataRequest {
    return validateOrThrow(barcodeDataSchema, data, 'Invalid barcode data');
  }
}
