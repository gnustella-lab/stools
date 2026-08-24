// TOTP (RFC 6238) - computed with Web Crypto, entirely in this tab.

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Decode(input: string): Uint8Array {
  const clean = input.toUpperCase().replace(/[\s-]/g, '').replace(/=+$/, '');
  if (!clean) {
    throw new Error('The secret is empty.');
  }
  if (/[^A-Z2-7]/.test(clean)) {
    throw new Error('The secret must contain only Base32 characters (A-Z and 2-7).');
  }
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of clean) {
    value = (value << 5) | BASE32_ALPHABET.indexOf(char);
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
      value &= (1 << bits) - 1;
    }
  }
  if (bytes.length === 0) {
    throw new Error('Could not decode the secret.');
  }
  return new Uint8Array(bytes);
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

export type TotpAlgorithm = 'SHA1' | 'SHA256' | 'SHA512';

export interface TotpParams {
  secret: string;
  digits: 6 | 8;
  period: number;
  algorithm: TotpAlgorithm;
}

export interface TotpResult {
  code: string;
  counter: number;
  secondsRemaining: number;
}

async function hmac(keyBytes: Uint8Array, message: Uint8Array, hash: TotpAlgorithm): Promise<Uint8Array> {
  const name = hash === 'SHA1' ? 'SHA-1' : hash === 'SHA256' ? 'SHA-256' : 'SHA-512';
  const key = await crypto.subtle.importKey(
    'raw',
    toArrayBuffer(keyBytes),
    {name: 'HMAC', hash: name},
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, toArrayBuffer(message));
  return new Uint8Array(signature);
}

/** Computes a TOTP code for the given parameters at Unix time `nowMs`. */
export async function computeTotp(params: TotpParams, nowMs: number): Promise<TotpResult> {
  const keyBytes = base32Decode(params.secret);
  const counter = Math.floor(nowMs / 1000 / params.period);

  // The moving factor is an unsigned 64-bit big-endian integer. JS bitwise
  // operations are 32-bit, so the two halves are built separately.
  const high = Math.floor(counter / 0x100000000);
  const low = counter >>> 0;
  const message = new Uint8Array(8);
  for (let i = 0; i < 4; i++) {
    message[i] = (high >>> (24 - 8 * i)) & 0xff;
    message[4 + i] = (low >>> (24 - 8 * i)) & 0xff;
  }

  const signature = await hmac(keyBytes, message, params.algorithm);
  const offset = signature[signature.length - 1] & 0x0f;
  const binary =
    ((signature[offset] & 0x7f) << 24) |
    ((signature[offset + 1] & 0xff) << 16) |
    ((signature[offset + 2] & 0xff) << 8) |
    (signature[offset + 3] & 0xff);
  const code = String(binary % 10 ** params.digits).padStart(params.digits, '0');

  return {
    code,
    counter,
    secondsRemaining: params.period - (Math.floor(nowMs / 1000) % params.period),
  };
}
