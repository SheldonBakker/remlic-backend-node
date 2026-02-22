import type { IRSAPublicKey } from './pemParser';

export class DecryptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DecryptionError';
  }
}

export function bytesToBigInt(bytes: Uint8Array): bigint {
  let result = 0n;
  for (const byte of bytes) {
    result = (result << 8n) | BigInt(byte);
  }
  return result;
}

export function bigIntToBytes(value: bigint, length: number): Uint8Array {
  const hex = value.toString(16).padStart(length * 2, '0');
  const out = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    out[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  let result = 1n;
  base = base % mod;
  while (exp > 0n) {
    if (exp & 1n) {
      result = (result * base) % mod;
    }
    exp >>= 1n;
    base = (base * base) % mod;
  }
  return result;
}

export function decryptBlock(blockBytes: Uint8Array, key: IRSAPublicKey, outputSize: number): Uint8Array {
  const input = bytesToBigInt(blockBytes);
  const decrypted = modPow(input, key.e, key.n);
  return bigIntToBytes(decrypted, outputSize);
}

export function decryptSixBlockPayload(
  encryptedPayload: Uint8Array,
  block128Key: IRSAPublicKey,
  block74Key: IRSAPublicKey,
): Uint8Array {
  if (encryptedPayload.length < 714) {
    throw new DecryptionError('Encrypted payload too short');
  }

  const result = new Uint8Array(714);

  for (let i = 0; i < 5; i++) {
    const block = encryptedPayload.slice(i * 128, i * 128 + 128);
    const decryptedBlock = decryptBlock(block, block128Key, 128);
    result.set(decryptedBlock, i * 128);
  }

  const finalBlock = encryptedPayload.slice(5 * 128);
  const decryptedFinal = decryptBlock(finalBlock, block74Key, 74);
  result.set(decryptedFinal, 640);

  return result;
}

export function bytesToNibbles(bytes: Uint8Array): number[] {
  const nibbles: number[] = [];
  for (const byte of bytes) {
    nibbles.push((byte >> 4) & 0x0f);
    nibbles.push(byte & 0x0f);
  }
  return nibbles;
}
