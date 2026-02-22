import { parsePkcs1Pem, type IRSAPublicKey } from '../services/pemParser';
import { config } from '../../config/env.config';

export const v1Block128Key: IRSAPublicKey = parsePkcs1Pem(config.decrypt.v1Pk128);
export const v1Block74Key: IRSAPublicKey = parsePkcs1Pem(config.decrypt.v1Pk74);
export const v2Block128Key: IRSAPublicKey = parsePkcs1Pem(config.decrypt.v2Pk128);
export const v2Block74Key: IRSAPublicKey = parsePkcs1Pem(config.decrypt.v2Pk74);
