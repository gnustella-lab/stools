export interface HarSanitizeOptions {
  cookies: boolean;
  authHeaders: boolean;
  querySecrets: boolean;
  bodies: boolean;
  ipAddresses: boolean;
}

export const DEFAULT_HAR_OPTIONS: HarSanitizeOptions = {
  cookies: true,
  authHeaders: true,
  querySecrets: true,
  bodies: true,
  ipAddresses: true,
};

export interface HarSanitizeResult {
  output: string;
  format: 'har' | 'json' | 'text';
  counts: Record<string, number>;
  total: number;
}

const REDACT = '[REDACTED]';

const AUTH_HEADER = /^(authorization|proxy-authorization|x-api-key|x-apikey|x-auth-token|x-csrf-token|x-xsrf-token|x-access-token|x-session-token|api-key|apikey)$/i;
const COOKIE_HEADER = /^(cookie|set-cookie|cookie2)$/i;
const SECRET_KEY = /^(?:.*(?:token|secret|password|passwd|passphrase|authorization|auth|api[_-]?key|apikey|access[_-]?key|refresh|session|jwt|bearer|private[_-]?key|client[_-]?secret|csrf|xsrf|sid|otp).*)/i;
const IPV4_RE = /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d?\d)\b/;
const IPV4_ALL = new RegExp(IPV4_RE.source, 'g');
const IPV6_RE =
  /\b(?:[0-9a-f]{1,4}:){2,7}[0-9a-f]{1,4}\b|\b(?:[0-9a-f]{1,4}:){1,7}:|:(?::[0-9a-f]{1,4}){1,7}\b/i;
const IPV6_ALL = new RegExp(IPV6_RE.source, 'gi');
const JWT = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;
const BEARER = /\bBearer\s+[A-Za-z0-9._\-+=/]{8,}/gi;
const PEM_KEY =
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]+?-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g;

function bump(counts: Record<string, number>, key: string, n = 1): void {
  counts[key] = (counts[key] ?? 0) + n;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isHarDocument(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value)) return false;
  if (Array.isArray(value.entries)) return true;
  return isRecord(value.log) && Array.isArray(value.log.entries);
}

function redactTextSecrets(text: string, options: HarSanitizeOptions, counts: Record<string, number>): string {
  let out = text;
  const jwtHits = out.match(JWT)?.length ?? 0;
  if (jwtHits) {
    out = out.replace(JWT, REDACT);
    bump(counts, 'jwt', jwtHits);
  }
  const bearerHits = out.match(BEARER)?.length ?? 0;
  if (bearerHits) {
    out = out.replace(BEARER, 'Bearer [REDACTED]');
    bump(counts, 'auth', bearerHits);
  }
  const pemHits = out.match(PEM_KEY)?.length ?? 0;
  if (pemHits) {
    out = out.replace(PEM_KEY, '[REDACTED:private-key]');
    bump(counts, 'privateKey', pemHits);
  }
  if (options.ipAddresses) {
    const v4 = out.match(IPV4_ALL)?.length ?? 0;
    if (v4) {
      out = out.replace(IPV4_ALL, '[REDACTED:ip]');
      bump(counts, 'ip', v4);
    }
    const v6 = out.match(IPV6_ALL)?.length ?? 0;
    if (v6) {
      out = out.replace(IPV6_ALL, '[REDACTED:ipv6]');
      bump(counts, 'ip', v6);
    }
  }
  return out;
}

function redactUrl(url: string, options: HarSanitizeOptions, counts: Record<string, number>): string {
  try {
    const parsed = new URL(url);
    if (options.querySecrets) {
      const keys = [...parsed.searchParams.keys()];
      for (const key of keys) {
        if (SECRET_KEY.test(key)) {
          parsed.searchParams.set(key, REDACT);
          bump(counts, 'query');
        }
      }
    }
    if (options.ipAddresses && (IPV4_RE.test(parsed.hostname) || parsed.hostname.includes(':'))) {
      parsed.hostname = parsed.hostname.includes(':') ? 'redacted.invalid' : parsed.hostname.replace(IPV4_RE, '0.0.0.0');
      bump(counts, 'ip');
    }
    return parsed.toString();
  } catch {
    return redactTextSecrets(url, options, counts);
  }
}

function redactNameValue(
  item: Record<string, unknown>,
  kind: 'cookie' | 'header' | 'query' | 'param',
  options: HarSanitizeOptions,
  counts: Record<string, number>,
): void {
  const name = typeof item.name === 'string' ? item.name : '';
  if (typeof item.value !== 'string') return;

  if (kind === 'cookie' && options.cookies) {
    item.value = REDACT;
    bump(counts, 'cookie');
    return;
  }
  if (kind === 'header') {
    if (options.cookies && COOKIE_HEADER.test(name)) {
      item.value = REDACT;
      bump(counts, 'cookie');
      return;
    }
    if (options.authHeaders && AUTH_HEADER.test(name)) {
      item.value = REDACT;
      bump(counts, 'auth');
      return;
    }
    if (options.authHeaders && SECRET_KEY.test(name)) {
      item.value = REDACT;
      bump(counts, 'auth');
      return;
    }
  }
  if ((kind === 'query' || kind === 'param') && options.querySecrets && SECRET_KEY.test(name)) {
    item.value = REDACT;
    bump(counts, kind === 'query' ? 'query' : 'body');
    return;
  }
  if (options.bodies || options.authHeaders) {
    item.value = redactTextSecrets(item.value, options, counts);
  }
}

function walkUnknown(value: unknown, options: HarSanitizeOptions, counts: Record<string, number>): unknown {
  if (typeof value === 'string') {
    return redactTextSecrets(value, options, counts);
  }
  if (Array.isArray(value)) {
    return value.map(item => walkUnknown(item, options, counts));
  }
  if (!isRecord(value)) return value;

  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (typeof child === 'string' && SECRET_KEY.test(key) && (options.authHeaders || options.querySecrets || options.bodies)) {
      out[key] = REDACT;
      bump(counts, 'field');
      continue;
    }
    if (key === 'serverIPAddress' && options.ipAddresses && typeof child === 'string') {
      out[key] = REDACT;
      bump(counts, 'ip');
      continue;
    }
    out[key] = walkUnknown(child, options, counts);
  }
  return out;
}

function sanitizeHarObject(root: Record<string, unknown>, options: HarSanitizeOptions, counts: Record<string, number>): void {
  const log = isRecord(root.log) ? root.log : root;
  const entries = Array.isArray(log.entries) ? log.entries : [];
  for (const entry of entries) {
    if (!isRecord(entry)) continue;
    if (typeof entry.serverIPAddress === 'string' && options.ipAddresses) {
      entry.serverIPAddress = REDACT;
      bump(counts, 'ip');
    }
    for (const side of ['request', 'response'] as const) {
      const node = entry[side];
      if (!isRecord(node)) continue;
      if (typeof node.url === 'string') {
        node.url = redactUrl(node.url, options, counts);
      }
      if (Array.isArray(node.headers)) {
        for (const header of node.headers) {
          if (isRecord(header)) redactNameValue(header, 'header', options, counts);
        }
      }
      if (Array.isArray(node.cookies) && options.cookies) {
        for (const cookie of node.cookies) {
          if (isRecord(cookie)) redactNameValue(cookie, 'cookie', options, counts);
        }
      }
      if (Array.isArray(node.queryString)) {
        for (const query of node.queryString) {
          if (isRecord(query)) redactNameValue(query, 'query', options, counts);
        }
      }
      if (side === 'request' && isRecord(node.postData) && options.bodies) {
        const requestText = node.postData.text;
        if (typeof requestText === 'string') {
          try {
            const parsedBody: unknown = JSON.parse(requestText);
            node.postData.text = JSON.stringify(walkUnknown(parsedBody, options, counts));
          } catch {
            node.postData.text = redactTextSecrets(requestText, options, counts);
          }
        }
        if (Array.isArray(node.postData.params)) {
          for (const param of node.postData.params) {
            if (isRecord(param)) redactNameValue(param, 'param', options, counts);
          }
        }
      }
      if (side === 'response' && isRecord(node.content) && options.bodies) {
        const responseText = node.content.text;
        if (typeof responseText === 'string') {
          try {
            const parsed: unknown = JSON.parse(responseText);
            node.content.text = JSON.stringify(walkUnknown(parsed, options, counts));
          } catch {
            node.content.text = redactTextSecrets(responseText, options, counts);
          }
        }
      }
    }
  }
}

export function sanitizeCapture(input: string, options: HarSanitizeOptions = DEFAULT_HAR_OPTIONS): HarSanitizeResult {
  const counts: Record<string, number> = {};
  const trimmed = input.trim();
  if (!trimmed) {
    return {output: '', format: 'text', counts, total: 0};
  }

  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (isHarDocument(parsed)) {
      const clone = structuredClone(parsed);
      sanitizeHarObject(clone, options, counts);
      const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
      return {output: JSON.stringify(clone, null, 2), format: 'har', counts, total};
    }
    if (isRecord(parsed) || Array.isArray(parsed)) {
      const cleaned = walkUnknown(parsed, options, counts);
      const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
      return {output: JSON.stringify(cleaned, null, 2), format: 'json', counts, total};
    }
  } catch {
    // fall through to text mode
  }

  const output = redactTextSecrets(input, options, counts);
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
  return {output, format: 'text', counts, total};
}
