import type { IRSAPublicKey } from '../services/pemParser.js';
import { parsePkcs1Pem } from '../services/pemParser.js';
import { config } from '../../config/env.config.js';

export const v1Block128Key: IRSAPublicKey = parsePkcs1Pem(config.decrypt.v1Pk128);
export const v1Block74Key: IRSAPublicKey = parsePkcs1Pem(config.decrypt.v1Pk74);
export const v2Block128Key: IRSAPublicKey = parsePkcs1Pem(config.decrypt.v2Pk128);
export const v2Block74Key: IRSAPublicKey = parsePkcs1Pem(config.decrypt.v2Pk74);
