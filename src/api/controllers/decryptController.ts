import type { Request, Response, NextFunction } from 'express';
import { ResponseUtil } from '../../shared/utils/response';
import { HTTP_STATUS } from '../../shared/constants/httpStatus';
import { HttpError } from '../../shared/types/errors/appError';
import { DecryptValidation } from '../../infrastructure/decrypt/validation';
import { decryptAndParseDriverLicense } from '../../infrastructure/decrypt/services/driverLicenseDecryption';
import { decryptAndParseVehicleLicense } from '../../infrastructure/decrypt/services/vehicleLicenseDecryption';
import { DecryptionError } from '../../infrastructure/decrypt/services/rsaBarcodeCrypto';

export default class DecryptController {
  public static decrypt = (
    req: Request,
    res: Response,
    _next: NextFunction,
  ): void => {
    const type = DecryptValidation.validateType(req.params.type);
    const { barcodeData } = DecryptValidation.validateBarcodeData(req.body);
    const rawData = new Uint8Array(Buffer.from(barcodeData, 'base64'));

    try {
      const result = type === 'drivers'
        ? decryptAndParseDriverLicense(rawData)
        : decryptAndParseVehicleLicense(rawData);
      ResponseUtil.success(res, result, HTTP_STATUS.OK);
    } catch (error) {
      if (error instanceof DecryptionError) {
        throw new HttpError(HTTP_STATUS.UNPROCESSABLE_ENTITY, error.message);
      }
      throw error;
    }
  };
}
