import type { ISADriversLicense } from '../types';
import { v1Block128Key, v1Block74Key, v2Block128Key, v2Block74Key } from '../keys/rsaKeys';
import { decryptSixBlockPayload, bytesToNibbles, DecryptionError } from './rsaBarcodeCrypto';

interface IDecryptResult {
  data: Uint8Array;
  version: number;
}

export function decryptAndParseDriverLicense(rawData: Uint8Array): ISADriversLicense {
  const decryptResult = decryptLicense(rawData);
  return parseLicense(decryptResult.data, decryptResult.version);
}

// eslint-disable-next-line complexity
function decryptLicense(rawData: Uint8Array): IDecryptResult {
  let startOffset = -1;
  let version: number | null = null;

  const maxSearch = rawData.length - 4;
  if (maxSearch < 0) {
    throw new DecryptionError('Data too short to contain version signature');
  }

  for (let i = 0; i <= maxSearch; i++) {
    if ((rawData[i] ?? 0) === 0x01 && i + 3 < rawData.length && (rawData[i + 3] ?? 0) === 0x45) {
      if ((rawData[i + 1] ?? 0) === 0xe1 && (rawData[i + 2] ?? 0) === 0x02) {
        startOffset = i;
        version = 1;
        break;
      }
      if ((rawData[i + 1] ?? 0) === 0x9b && (rawData[i + 2] ?? 0) === 0x09) {
        startOffset = i;
        version = 2;
        break;
      }
    }
  }

  if (startOffset === -1 || version === null) {
    throw new DecryptionError('Unable to find version signature in barcode data');
  }

  const remaining = rawData.length - startOffset;
  if (remaining < 720) {
    throw new DecryptionError(
      `Not enough data after version signature. Found: ${remaining} bytes, need: 720`,
    );
  }

  const licenseBytes = rawData.slice(startOffset, startOffset + 720);
  const payload = licenseBytes.slice(6);

  const block128Key = version === 1 ? v1Block128Key : v2Block128Key;
  const block74Key = version === 1 ? v1Block74Key : v2Block74Key;
  const result = decryptSixBlockPayload(payload, block128Key, block74Key);

  return { data: result, version };
}

// eslint-disable-next-line complexity
function parseLicense(decryptedData: Uint8Array, version: number): ISADriversLicense {
  if (decryptedData.length < 100) {
    throw new DecryptionError('Decrypted data too small');
  }

  const payloadStart = findPayloadStart(decryptedData);

  if (payloadStart + 10 >= decryptedData.length) {
    throw new DecryptionError('Invalid payload header');
  }

  const section2Length = decryptedData[payloadStart + 7] ?? 0;
  const section1Length = decryptedData[payloadStart + 10] ?? 0;

  const offsetSection1 = payloadStart + 15;
  const offsetSection2 = offsetSection1 + section1Length;

  if (offsetSection2 > decryptedData.length) {
    throw new DecryptionError('Section 1 overflow');
  }

  if (offsetSection2 + section2Length > decryptedData.length) {
    throw new DecryptionError('Section 2 overflow');
  }

  const section1 = decryptedData.slice(offsetSection1, offsetSection1 + section1Length);
  const strings = parseStrings(section1);

  if (strings.length < 15) {
    throw new DecryptionError(
      `Invalid string section. Expected >= 15 fields, got ${strings.length}`,
    );
  }

  const vehicleCodes = strings.slice(0, 4);
  const surname = strings[4] ?? '';
  const initials = strings[5] ?? '';
  const prdpField = strings[6] ?? '';
  const prdpCodes = prdpField === '' ? null : prdpField.split(',');
  const idCountry = strings[7] ?? '';
  const licenseCountry = strings[8] ?? '';
  const vehicleRestrictions = strings.slice(9, 13);
  const licenseNumber = strings[13] ?? '';
  const idNumber = strings[14] ?? '';

  const section2 = decryptedData.slice(offsetSection2, offsetSection2 + section2Length);
  const nibbles = bytesToNibbles(section2);

  if (nibbles.length < 40) {
    throw new DecryptionError('Invalid nibble stream');
  }

  let nIndex = 0;

  const idNumberType = `${nibbles[nIndex] ?? 0}${nibbles[nIndex + 1] ?? 0}`;
  nIndex += 2;

  const vehicleIssueDates: (string | null)[] = [];
  for (let i = 0; i < 4; i++) {
    const [date, consumed] = parseDateOrNull(nibbles, nIndex);
    vehicleIssueDates.push(date);
    nIndex += consumed;
  }

  const driverRestrictions = `${nibbles[nIndex] ?? 0}${nibbles[nIndex + 1] ?? 0}`;
  nIndex += 2;

  const [prdpExpiry, prdpConsumed] = parseDateOrNull(nibbles, nIndex);
  nIndex += prdpConsumed;

  const licenseIssueNumber = `${nibbles[nIndex] ?? 0}${nibbles[nIndex + 1] ?? 0}`;
  nIndex += 2;

  const birthDate = parseDate(nibbles, nIndex);
  nIndex += 8;

  const validFrom = parseDate(nibbles, nIndex);
  nIndex += 8;

  const validTo = parseDate(nibbles, nIndex);
  nIndex += 8;

  const genderRaw = `${nibbles[nIndex] ?? 0}${nibbles[nIndex + 1] ?? 0}`;

  const vehicleLicenses: Array<{ code: string; restriction: string; firstIssueDate: string }> = [];

  for (let i = 0; i < 4; i++) {
    const code = vehicleCodes[i] ?? '';
    const restriction = vehicleRestrictions[i] ?? '';
    const issueDate = vehicleIssueDates[i] ?? null;
    if (issueDate !== null && code !== '') {
      vehicleLicenses.push({
        code,
        restriction,
        firstIssueDate: issueDate,
      });
    }
  }

  const gender = genderToCode(genderRaw);

  return {
    version,
    vehicleCodes,
    surname,
    initials,
    professionalDrivingPermitCodes: prdpCodes,
    idCountry,
    licenseCountry,
    vehicleRestrictions,
    licenseNumber,
    idNumber,
    idNumberType,
    dateOfBirth: birthDate,
    gender,
    driverRestrictions,
    licenseIssueNumber,
    licenseStartDate: validFrom,
    expiryDate: validTo,
    professionalDrivingPermitExpiry: prdpExpiry,
    vehicleLicenses: vehicleLicenses.length > 0 ? vehicleLicenses : null,
  };
}

function genderToCode(raw: string): string | null {
  switch (raw) {
    case '01': return 'M';
    case '02': return 'F';
    case 'M': return 'M';
    case 'F': return 'F';
    default: return null;
  }
}

function parseDate(nibbles: number[], index: number): string {
  if (index + 7 >= nibbles.length) {
    return '';
  }

  const year = (nibbles[index] ?? 0) * 1000 + (nibbles[index + 1] ?? 0) * 100 + (nibbles[index + 2] ?? 0) * 10 + (nibbles[index + 3] ?? 0);
  const month = (nibbles[index + 4] ?? 0) * 10 + (nibbles[index + 5] ?? 0);
  const day = (nibbles[index + 6] ?? 0) * 10 + (nibbles[index + 7] ?? 0);

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseDateOrNull(nibbles: number[], index: number): [string | null, number] {
  if (index >= nibbles.length) {
    return [null, 0];
  }
  if ((nibbles[index] ?? 0) === 0xa) {
    return [null, 1];
  }
  return [parseDate(nibbles, index), 8];
}

function parseStrings(bytes: Uint8Array): string[] {
  const result: string[] = [];
  let current: number[] = [];

  for (const byte of bytes) {
    if (byte === 0xe0) {
      result.push(Buffer.from(current).toString('utf8'));
      current = [];
    } else if (byte === 0xe1) {
      if (current.length > 0) {
        result.push(Buffer.from(current).toString('utf8'));
        current = [];
      }
      result.push('');
    } else {
      current.push(byte);
    }
  }

  if (current.length > 0) {
    result.push(Buffer.from(current).toString('utf8'));
  }

  return result;
}

// eslint-disable-next-line complexity
function findPayloadStart(bytes: Uint8Array): number {
  for (let i = 0; i < 40 && i + 4 < bytes.length; i++) {
    if (
      (bytes[i] ?? 0) === 0x01 &&
      (bytes[i + 1] ?? 0) === 0x02 &&
      (bytes[i + 2] ?? 0) === 0x03 &&
      (bytes[i + 3] ?? 0) === 0x04 &&
      (bytes[i + 4] ?? 0) === 0x05
    ) {
      return i;
    }
  }
  throw new DecryptionError('License header signature not found');
}
