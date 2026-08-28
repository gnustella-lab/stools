function hashSync(input: string, salt: string): string {
  let h = 0x811c9dc5;
  const data = `${salt}:${input}`;
  for (let i = 0; i < data.length; i++) {
    h ^= data.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0').slice(0, 6);
}

export interface LogAnonOptions {
  salt: string;
  ipMode: 'redact' | 'hash' | 'mask';
  uaMode: 'redact' | 'hash' | 'keep';
  queryMode: 'redact' | 'hash' | 'keep';
  emailMode: 'redact' | 'hash' | 'keep';
}

export const DEFAULT_LOG_OPTIONS: LogAnonOptions = {
  salt: 'log-salt',
  ipMode: 'redact',
  uaMode: 'redact',
  queryMode: 'redact',
  emailMode: 'redact',
};

export interface LogAnonResult {
  output: string;
  lines: number;
  counts: Record<string, number>;
}

const IP_RE = /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d?\d)\b/g;
const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const QUERY_SECRET_RE = /([?&])(token|access_token|api_key|apikey|secret|password|auth|jwt|bearer|session)=([^&\s"']+)/gi;
// UA is inside quotes after request:  "GET / HTTP/1.1" 200 ... "https://ref" "Mozilla/5.0 ..."

function bump(c: Record<string, number>, k: string, n = 1) {
  c[k] = (c[k] ?? 0) + n;
}

export function anonymizeLog(text: string, options: LogAnonOptions = DEFAULT_LOG_OPTIONS): LogAnonResult {
  const ipCache = new Map<string, string>();
  const getIpPseudo = (ip: string): string => {
    if (options.ipMode === 'redact') return '[REDACTED:ip]';
    if (options.ipMode === 'mask') {
      const parts = ip.split('.');
      return `${parts[0]}.${parts[1]}.***.***`;
    }
    if (!ipCache.has(ip)) ipCache.set(ip, `ip_${hashSync(ip, options.salt)}`);
    return ipCache.get(ip)!;
  };

  const lines = text.split(/\r?\n/);
  const counts: Record<string, number> = {};
  const outLines = lines.map(line => {
    let out = line;

    // IPs
    const ips = out.match(IP_RE);
    if (ips) {
      out = out.replace(IP_RE, m => {
        bump(counts, 'ip');
        return getIpPseudo(m);
      });
    }

    // Emails
    if (options.emailMode !== 'keep') {
      const emails = out.match(EMAIL_RE);
      if (emails) {
        out = out.replace(EMAIL_RE, m => {
          bump(counts, 'email');
          return options.emailMode === 'hash' ? `user_${hashSync(m, options.salt)}@example.invalid` : '[REDACTED:email]';
        });
      }
    }

    // Query secrets
    if (options.queryMode !== 'keep') {
      const qs = [...out.matchAll(QUERY_SECRET_RE)];
      if (qs.length) {
        out = out.replace(QUERY_SECRET_RE, (_m, sep, key) => {
          bump(counts, 'query');
          const replacement = options.queryMode === 'hash' ? hashSync(key, options.salt) : '[REDACTED]';
          return `${sep}${key}=${replacement}`;
        });
      }
    }

    // UA — heuristic: last quoted string often is UA
    if (options.uaMode !== 'keep') {
      // find quoted strings
      const quoted = [...out.matchAll(/"([^"]*)"/g)];
      if (quoted.length >= 2) {
        const last = quoted[quoted.length - 1];
        const ua = last[1];
        if (ua && /Mozilla|Chrome|Safari|Firefox|Edge|Opera|AppleWebKit/i.test(ua)) {
          const replacement = options.uaMode === 'hash' ? `UA_${hashSync(ua, options.salt)}` : '[REDACTED:ua]';
          out = out.replace(`"${ua}"`, `"${replacement}"`);
          bump(counts, 'ua');
        }
      }
    }

    // Bearer/JWT outside query
    const jwtRe = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;
    const jwts = out.match(jwtRe);
    if (jwts) {
      out = out.replace(jwtRe, () => {
        bump(counts, 'jwt');
        return '[REDACTED:jwt]';
      });
    }

    return out;
  });

  return { output: outLines.join('\n'), lines: lines.length, counts };
}
