const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function encodeTime(time: number, len: number): string {
  let out = '';
  for (let i = len - 1; i >= 0; i--) {
    const mod = time % 32;
    out = CROCKFORD[mod] + out;
    time = Math.floor(time / 32);
  }
  return out;
}

function encodeRandom(len: number): string {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < len; i++) {
    out += CROCKFORD[bytes[i] & 31];
  }
  return out;
}

export function generateUlid(timestamp = Date.now()): string {
  const timePart = encodeTime(timestamp, 10);
  const randPart = encodeRandom(16);
  return timePart + randPart;
}

export function generateKsuid(timestamp = Date.now()): string {
  // KSUID: 4-byte timestamp + 16-byte random, base62 — simplified as ULID-like with different prefix
  const timePart = encodeTime(Math.floor(timestamp / 1000), 7);
  const randPart = encodeRandom(18);
  return timePart + randPart;
}

export type OrderedIdType = 'ulid' | 'ksuid';

export function generateOrderedIds(count: number, type: OrderedIdType, startTime = Date.now()): string[] {
  if (count < 1 || count > 5000) throw new Error('Count must be 1-5000.');
  const out: string[] = [];
  let t = startTime;
  for (let i = 0; i < count; i++) {
    const id = type === 'ulid' ? generateUlid(t) : generateKsuid(t);
    out.push(id);
    // ensure monotonic if called fast: add 1ms occasionally
    if (i % 10 === 0) t += 1;
  }
  return out;
}

export function isValidUlid(id: string): boolean {
  return /^[0-9A-HJKMNP-TV-Z]{26}$/i.test(id);
}
