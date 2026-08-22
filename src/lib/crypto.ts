import {concatBytes, toArrayBuffer} from './bytes';

const MAGIC = new TextEncoder().encode('STLS');
const VERSION = 1;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const PBKDF2_ITERATIONS = 210_000;

async function deriveAesKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: toArrayBuffer(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    material,
    {name: 'AES-GCM', length: 256},
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptPayload(
  plaintext: Uint8Array,
  passphrase: string,
  filename = '',
): Promise<Uint8Array> {
  if (!passphrase) {
    throw new Error('A passphrase is required.');
  }
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await deriveAesKey(passphrase, salt);
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt(
      {name: 'AES-GCM', iv: toArrayBuffer(iv)},
      key,
      toArrayBuffer(plaintext),
    ),
  );
  const nameBytes = new TextEncoder().encode(filename);
  if (nameBytes.length > 0xffff) {
    throw new Error('Filename is too long to store in the payload.');
  }
  const nameLen = new Uint8Array([(nameBytes.length >> 8) & 0xff, nameBytes.length & 0xff]);
  return concatBytes(MAGIC, new Uint8Array([VERSION]), nameLen, nameBytes, salt, iv, cipher);
}

export interface DecryptedPayload {
  bytes: Uint8Array;
  filename: string;
}

export async function decryptPayload(
  payload: Uint8Array,
  passphrase: string,
): Promise<DecryptedPayload> {
  if (!passphrase) {
    throw new Error('A passphrase is required.');
  }
  if (payload.length < MAGIC.length + 1 + 2 + SALT_LENGTH + IV_LENGTH + 16) {
    throw new Error('Payload is too short to be an sTools envelope.');
  }
  for (let i = 0; i < MAGIC.length; i++) {
    if (payload[i] !== MAGIC[i]) {
      throw new Error('Not an sTools encrypted envelope (missing STLS header).');
    }
  }
  const version = payload[4];
  if (version !== VERSION) {
    throw new Error(`Unsupported envelope version ${version}.`);
  }
  const nameLen = (payload[5] << 8) | payload[6];
  let offset = 7;
  const nameBytes = payload.slice(offset, offset + nameLen);
  offset += nameLen;
  const salt = payload.slice(offset, offset + SALT_LENGTH);
  offset += SALT_LENGTH;
  const iv = payload.slice(offset, offset + IV_LENGTH);
  offset += IV_LENGTH;
  const cipher = payload.slice(offset);
  try {
    const key = await deriveAesKey(passphrase, salt);
    const bytes = new Uint8Array(
      await crypto.subtle.decrypt(
        {name: 'AES-GCM', iv: toArrayBuffer(iv)},
        key,
        toArrayBuffer(cipher),
      ),
    );
    return {bytes, filename: new TextDecoder().decode(nameBytes)};
  } catch {
    throw new Error('Decryption failed. Check the passphrase and that the payload is intact.');
  }
}

export type HmacAlgorithm = 'SHA-256' | 'SHA-384' | 'SHA-512';

export async function hmacHex(
  algorithm: HmacAlgorithm,
  secret: string,
  message: Uint8Array,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    {name: 'HMAC', hash: algorithm},
    false,
    ['sign'],
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign('HMAC', key, toArrayBuffer(message)),
  );
  return [...signature].map(b => b.toString(16).padStart(2, '0')).join('');
}
