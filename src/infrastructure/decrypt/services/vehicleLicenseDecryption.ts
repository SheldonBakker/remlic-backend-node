import type { ISAVehicleLicense } from '../types';
import { v1Block128Key, v1Block74Key, v2Block128Key, v2Block74Key } from '../keys/rsaKeys';
import { decryptSixBlockPayload, bytesToNibbles } from './rsaBarcodeCrypto';

export function decryptAndParseVehicleLicense(rawData: Uint8Array): ISAVehicleLicense {
  let dataToProcess: Uint8Array;

  if (rawData.length < 300) {
    dataToProcess = rawData;
  } else {
    dataToProcess = tryDecrypt(rawData);
  }

  return parseVehicleLicense(dataToProcess);
}

function tryDecrypt(rawData: Uint8Array): Uint8Array {
  try {
    return decrypt(rawData, v1Block128Key, v1Block74Key);
  } catch {
    return decrypt(rawData, v2Block128Key, v2Block74Key);
  }
}

function decrypt(
  rawData: Uint8Array,
  block128Key: { n: bigint; e: bigint },
  block74Key: { n: bigint; e: bigint },
): Uint8Array {
  const payload = rawData.slice(rawData.length - 720);
  const encrypted = payload.slice(6);
  return decryptSixBlockPayload(encrypted, block128Key, block74Key);
}

function parseVehicleLicense(decryptedData: Uint8Array): ISAVehicleLicense {
  const strings = parseStrings(decryptedData);
  const nibbles = bytesToNibbles(decryptedData);

  const registration = findRegistration(strings);
  const vin = findVin(strings);
  const make = findLikelyMake(strings);
  const color = findColor(strings);
  const vehicleClass = findVehicleClass(strings);

  let expiry = findExpiryDateInStrings(strings);
  expiry ??= findExpiryDate(nibbles);

  const model = findLikelyModel(strings, { make, registration, vin, color, vehicleClass, expiry });
  const engine = findEngine(strings, { make, model, registration, vin, color, vehicleClass, expiry });
  const ownerName = findOwnerName(strings);
  const ownerId = findOwnerId(strings);

  return {
    version: 1,
    registrationNumber: registration || 'UNKNOWN',
    vin: vin || null,
    engineNumber: engine || null,
    make: make || null,
    model: model || null,
    color: color || null,
    vehicleType: vehicleClass || null,
    ownerName: ownerName || null,
    ownerIdNumber: ownerId || null,
    licenseDiscExpiry: expiry,
  };
}

function findRegistration(strings: string[]): string {
  const regex = /^[A-Z]{2,4}\d{3,6}[A-Z]{0,2}$/;
  return strings.find(s => regex.test(s.trim())) ?? '';
}

function findVin(strings: string[]): string {
  const regex = /^[A-HJ-NPR-Z0-9]{17}$/;
  return strings.find(s => regex.test(s.trim())) ?? '';
}

function findEngine(
  strings: string[],
  ctx: { make: string; model: string; registration: string; vin: string; color: string; vehicleClass: string; expiry: string | null },
): string {
  const vinIndex = indexOfToken(strings, ctx.vin);
  if (vinIndex !== -1) {
    for (let i = vinIndex + 1; i < strings.length; i++) {
      const token = (strings[i] ?? '').trim();
      if (isEngineCandidate(token, ctx)) {
        return token;
      }
    }
  }

  for (let i = strings.length - 1; i >= 0; i--) {
    const token = (strings[i] ?? '').trim();
    if (isEngineCandidate(token, ctx)) {
      return token;
    }
  }

  return '';
}

function findLikelyMake(strings: string[]): string {
  const makes = [
    'TOYOTA', 'FORD', 'VOLKSWAGEN', 'VW', 'BMW', 'MERCEDES', 'AUDI', 'NISSAN',
    'HYUNDAI', 'KIA', 'MAZDA', 'HONDA', 'CHEVROLET', 'RENAULT', 'PEUGEOT',
    'CITROEN', 'SUBARU', 'SUZUKI', 'ISUZU', 'MITSUBISHI',
  ];

  let match = strings.find(s => makes.includes(s.toUpperCase()));
  match ??= strings.find(s =>
    s.length > 3 && s.length < 15 && /^[A-Z\s]+$/.test(s.toUpperCase()),
  );
  return match ?? '';
}

function findLikelyModel(
  strings: string[],
  ctx: { make: string; registration: string; vin: string; color: string; vehicleClass: string; expiry: string | null },
): string {
  const makeIndex = indexOfToken(strings, ctx.make);
  if (makeIndex !== -1) {
    for (let i = makeIndex + 1; i < strings.length && i <= makeIndex + 3; i++) {
      const token = (strings[i] ?? '').trim();
      if (isModelCandidate(token, ctx)) {
        return token;
      }
    }
  }

  for (const value of strings) {
    const token = value.trim();
    if (isModelCandidate(token, ctx)) {
      return token;
    }
  }
  return '';
}

function findColor(strings: string[]): string {
  const colors = [
    'WHITE', 'BLACK', 'SILVER', 'GREY', 'GRAY', 'BLUE', 'RED', 'GREEN',
    'YELLOW', 'BROWN', 'WIT', 'SWART', 'SILWER', 'GRYS', 'BLOU', 'ROOI',
    'GROEN', 'GEEL', 'BRUIN',
  ];
  return strings.find(s => colors.some(c => s.toUpperCase().includes(c))) ?? '';
}

function findVehicleClass(strings: string[]): string {
  return strings.find(s => {
    const lower = s.toLowerCase();
    return lower.includes('hatch') || lower.includes('sedan') || lower.includes('bus') ||
      lower.includes('luikrug') || lower.includes('bakkie') || lower.includes('truck');
  }) ?? '';
}

function findOwnerName(strings: string[]): string {
  return strings.find(s => s.includes(' ') && s.length > 5) ?? '';
}

function findOwnerId(strings: string[]): string {
  return strings.find(s => /^\d{13}$/.test(s)) ?? '';
}

function findExpiryDateInStrings(strings: string[]): string | null {
  const dateRegex = /^\d{4}[-/.]\d{2}[-/.]\d{2}$/;
  for (const s of strings) {
    if (dateRegex.test(s.trim())) {
      return s.trim().replace(/\//g, '-').replace(/\./g, '-');
    }
  }

  const shortDateRegex = /^(\d{2})-(\d{2})-(\d{2})$/;
  for (const s of strings) {
    const match = s.trim().match(shortDateRegex);
    if (match) {
      const year = parseInt(match[1]);
      const fullYear = year < 50 ? 2000 + year : 1900 + year;
      return `${fullYear}-${match[2]}-${match[3]}`;
    }
  }

  return null;
}

function findExpiryDate(nibbles: number[]): string | null {
  for (let i = 0; i < nibbles.length - 8; i++) {
    const year = (nibbles[i] ?? 0) * 1000 + (nibbles[i + 1] ?? 0) * 100 + (nibbles[i + 2] ?? 0) * 10 + (nibbles[i + 3] ?? 0);
    const month = (nibbles[i + 4] ?? 0) * 10 + (nibbles[i + 5] ?? 0);
    const day = (nibbles[i + 6] ?? 0) * 10 + (nibbles[i + 7] ?? 0);

    if (year >= 2000 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }
  return null;
}

function parseStrings(bytes: Uint8Array): string[] {
  const decoded = Buffer.from(bytes).toString('utf8');

  if (decoded.includes('%')) {
    return decoded.split('%').map(s => s.trim()).filter(s => s.length > 0);
  }

  const result: string[] = [];
  let current: number[] = [];

  for (const byte of bytes) {
    if (byte === 0xe0) {
      if (current.length > 0) {
        result.push(Buffer.from(current).toString('utf8').trim());
        current = [];
      }
    } else if (byte === 0xe1) {
      result.push('');
    } else {
      current.push(byte);
    }
  }

  if (current.length > 0) {
    result.push(Buffer.from(current).toString('utf8').trim());
  }

  return result.filter(s => s.length > 0);
}

function isModelCandidate(
  token: string,
  ctx: { make: string; registration: string; vin: string; color: string; vehicleClass: string; expiry: string | null },
): boolean {
  if (token.length < 2 || token.length > 20) {
    return false;
  }
  if (!/^[A-Z0-9\s-]+$/.test(token.toUpperCase())) {
    return false;
  }
  if (token.includes('/')) {
    return false;
  }
  if (equalsAny(token, [ctx.make, ctx.registration, ctx.vin, ctx.color, ctx.vehicleClass, ctx.expiry ?? ''])) {
    return false;
  }
  if (isVinToken(token) || isRegistrationToken(token) || isDateToken(token)) {
    return false;
  }
  if (/^\d+$/.test(token)) {
    return false;
  }
  if (!token.includes(' ') && token.length >= 8 && /^(?=.*[A-Z])(?=.*\d)[A-Z0-9-]+$/.test(token.toUpperCase())) {
    return false;
  }
  return true;
}

function isEngineCandidate(
  token: string,
  ctx: { make: string; model: string; registration: string; vin: string; color: string; vehicleClass: string; expiry: string | null },
): boolean {
  if (!/^[A-Z0-9]{8,20}$/.test(token.toUpperCase())) {
    return false;
  }
  if (equalsAny(token, [ctx.make, ctx.model, ctx.registration, ctx.vin, ctx.color, ctx.vehicleClass, ctx.expiry ?? ''])) {
    return false;
  }
  if (isVinToken(token) || isRegistrationToken(token) || isDateToken(token)) {
    return false;
  }
  if (!/(?=.*[A-Z])(?=.*\d)/.test(token.toUpperCase())) {
    return false;
  }
  return true;
}

function equalsAny(value: string, candidates: string[]): boolean {
  const normalized = value.trim().toUpperCase();
  return candidates.some(c => c.trim().toUpperCase() === normalized);
}

function indexOfToken(strings: string[], token: string): number {
  if (!token.trim()) {
    return -1;
  }
  const lookup = token.trim().toUpperCase();
  return strings.findIndex(s => s.trim().toUpperCase() === lookup);
}

function isVinToken(token: string): boolean {
  return /^[A-HJ-NPR-Z0-9]{17}$/.test(token.trim().toUpperCase());
}

function isRegistrationToken(token: string): boolean {
  return /^[A-Z]{2,4}\d{3,6}[A-Z]{0,2}$/.test(token.trim().toUpperCase());
}

function isDateToken(token: string): boolean {
  const normalized = token.trim().replace(/\//g, '-').replace(/\./g, '-');
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized);
}
