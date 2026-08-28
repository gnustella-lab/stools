export interface CurlScrubOptions {
  cookies: boolean;
  authHeaders: boolean;
  querySecrets: boolean;
  tokens: boolean;
  ips: boolean;
}

export const DEFAULT_CURL_OPTIONS: CurlScrubOptions = {
  cookies: true,
  authHeaders: true,
  querySecrets: true,
  tokens: true,
  ips: true,
};

export interface CurlScrubResult {
  output: string;
  counts: Record<string, number>;
  total: number;
}

const REDACT = '[REDACTED]';

const AUTH_RE = /(Authorization\s*:\s*)([^\r\n"']+)/gi;
const BEARER_RE = /\bBearer\s+[A-Za-z0-9._\-+=/]{8,}/gi;
const COOKIE_RE = /(Cookie\s*:\s*)([^\r\n"']+)/gi;
const SET_COOKIE_RE = /(Set-Cookie\s*:\s*)([^\r\n"']+)/gi;
const COOKIE_ARG_RE = /(?:-b|--cookie|--cookie-jar)\s+["']?([^"'\r\n]+)["']?/gi;
const HEADER_ARG_RE = /(?:-H|--header)\s+["']([^"']+)["']/gi;
const TOKEN_QUERY_RE = /([?&])(token|access_token|api_key|apikey|secret|password|auth|jwt|bearer)=([^&\s"']+)/gi;
const JWT_RE = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;
const IPV4_RE = /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d?\d)\b/g;

function bump(c: Record<string, number>, k: string, n = 1) {
  c[k] = (c[k] ?? 0) + n;
}

export function scrubCurl(input: string, options: CurlScrubOptions = DEFAULT_CURL_OPTIONS): CurlScrubResult {
  const counts: Record<string, number> = {};
  let out = input;

  if (options.authHeaders) {
    const authHits = [...out.matchAll(AUTH_RE)];
    if (authHits.length) {
      out = out.replace(AUTH_RE, (_m, p1) => `${p1}${REDACT}`);
      bump(counts, 'auth', authHits.length);
    }
    // generic -H "X-Api-Key: xxx"
    const headerHits = [...out.matchAll(HEADER_ARG_RE)];
    for (const m of headerHits) {
      const headerVal = m[1];
      if (/^(x-api-key|x-auth-token|api-key|authorization)/i.test(headerVal) || /secret|token|password/i.test(headerVal)) {
        const redacted = headerVal.replace(/:\s*.+/, `: ${REDACT}`);
        out = out.replace(m[0], m[0].replace(headerVal, redacted));
        bump(counts, 'auth');
      }
    }
  }

  if (options.cookies) {
    const ck = [...out.matchAll(COOKIE_RE)];
    if (ck.length) {
      out = out.replace(COOKIE_RE, (_m, p1) => `${p1}${REDACT}`);
      bump(counts, 'cookie', ck.length);
    }
    const sc = [...out.matchAll(SET_COOKIE_RE)];
    if (sc.length) {
      out = out.replace(SET_COOKIE_RE, (_m, p1) => `${p1}${REDACT}`);
      bump(counts, 'cookie', sc.length);
    }
    const argCk = [...out.matchAll(COOKIE_ARG_RE)];
    if (argCk.length) {
      out = out.replace(COOKIE_ARG_RE, (_m, p1) => _m.replace(p1, REDACT));
      bump(counts, 'cookie', argCk.length);
    }
  }

  if (options.querySecrets) {
    const q = [...out.matchAll(TOKEN_QUERY_RE)];
    if (q.length) {
      out = out.replace(TOKEN_QUERY_RE, (_m, sep, key) => `${sep}${key}=${REDACT}`);
      bump(counts, 'query', q.length);
    }
  }

  if (options.tokens) {
    const jwtHits = out.match(JWT_RE)?.length ?? 0;
    if (jwtHits) {
      out = out.replace(JWT_RE, REDACT);
      bump(counts, 'jwt', jwtHits);
    }
    const bearerHits = out.match(BEARER_RE)?.length ?? 0;
    if (bearerHits) {
      out = out.replace(BEARER_RE, `Bearer ${REDACT}`);
      // avoid double count if already counted jwt
      if (!counts['jwt']) bump(counts, 'token', bearerHits);
      else bump(counts, 'token', bearerHits);
    }
  }

  if (options.ips) {
    const ipHits = out.match(IPV4_RE)?.length ?? 0;
    if (ipHits) {
      out = out.replace(IPV4_RE, '[REDACTED:ip]');
      bump(counts, 'ip', ipHits);
    }
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return { output: out, counts, total };
}

export function extractCurlSecretsPreview(input: string): string[] {
  const findings: string[] = [];
  if (/Authorization\s*:/i.test(input)) findings.push('Authorization header');
  if (/-b\s+|--cookie/i.test(input)) findings.push('Cookie argument');
  if (/Bearer\s+/i.test(input)) findings.push('Bearer token');
  if (/\beyJ/.test(input)) findings.push('JWT');
  if (/token=|api_key=|secret=/i.test(input)) findings.push('Query token/secret');
  return findings;
}
