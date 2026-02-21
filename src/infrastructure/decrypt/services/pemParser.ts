export interface IRSAPublicKey {
  n: bigint;
  e: bigint;
}

export function parsePkcs1Pem(pem: string): IRSAPublicKey {
  const base64 = pem
    .replace(/-----BEGIN RSA PUBLIC KEY-----/, '')
    .replace(/-----END RSA PUBLIC KEY-----/, '')
    .replace(/\s/g, '');

  const der = Buffer.from(base64, 'base64');
  let offset = 0;

  if (der[offset] !== 0x30) {
    throw new Error('Expected SEQUENCE');
  }
  offset++;
  const [, seqLenBytes] = readLength(der, offset);
  offset += seqLenBytes;

  if (der[offset] !== 0x02) {
    throw new Error('Expected INTEGER for modulus');
  }
  offset++;
  const [modLen, modLenBytes] = readLength(der, offset);
  offset += modLenBytes;
  const n = bufToBigInt(der.subarray(offset, offset + modLen));
  offset += modLen;

  if (der[offset] !== 0x02) {
    throw new Error('Expected INTEGER for exponent');
  }
  offset++;
  const [expLen, expLenBytes] = readLength(der, offset);
  offset += expLenBytes;
  const e = bufToBigInt(der.subarray(offset, offset + expLen));

  return { n, e };
}

function readLength(buf: Buffer, offset: number): [number, number] {
  const first = buf[offset] ?? 0;
  if (first < 0x80) {
    return [first, 1];
  }
  const numBytes = first & 0x7f;
  let length = 0;
  for (let i = 0; i < numBytes; i++) {
    length = (length << 8) | (buf[offset + 1 + i] ?? 0);
  }
  return [length, 1 + numBytes];
}

function bufToBigInt(buf: Buffer | Uint8Array): bigint {
  let result = 0n;
  for (const byte of buf) {
    result = (result << 8n) | BigInt(byte);
  }
  return result;
}
