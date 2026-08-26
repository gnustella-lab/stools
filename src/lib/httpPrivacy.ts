export type Severity = 'high' | 'medium' | 'low' | 'info';

export interface PrivacyFinding {
  severity: Severity;
  title: string;
  detail: string;
}

export interface CookieInspection {
  name: string;
  attributes: string[];
  source: 'Set-Cookie' | 'Cookie';
  findings: PrivacyFinding[];
}

export interface CookieReport {
  cookies: CookieInspection[];
  stats: {
    setCookies: number;
    requestCookies: number;
    likelyTracking: number;
    weakConfigurations: number;
  };
}

export interface HeaderReport {
  headers: Array<{name: string; value: string}>;
  findings: PrivacyFinding[];
  stats: {
    headers: number;
    setCookies: number;
  };
}

const TRACKING_COOKIE = /(?:^|[_-])(ga|gid|gat|fbp|fbc|gcl|gac|hj|clck|clsk|mp|amp|uet|hubspot|intercom)(?:[_-]|$)/i;
const TRACKER_DOMAIN = /(?:google-analytics|googletagmanager|doubleclick|facebook\.net|hotjar|mixpanel|segment\.|amplitude|clarity\.ms|hubspot|intercom)/i;
const DISPLAYED_HEADERS = [
  'content-security-policy',
  'permissions-policy',
  'referrer-policy',
  'cache-control',
  'clear-site-data',
  'cross-origin-opener-policy',
  'cross-origin-resource-policy',
  'access-control-allow-origin',
  'access-control-allow-credentials',
  'server',
  'x-powered-by',
];

function finding(severity: Severity, title: string, detail: string): PrivacyFinding {
  return {severity, title, detail};
}

function parseHeaderLines(raw: string): Map<string, string[]> {
  const headers = new Map<string, string[]>();
  let lastName: string | undefined;

  for (const line of raw.split(/\r?\n/)) {
    if (line.trim() === '') break;
    if (/^\s/.test(line) && lastName) {
      const values = headers.get(lastName);
      if (values) values[values.length - 1] += ` ${line.trim()}`;
      continue;
    }
    const separator = line.indexOf(':');
    if (separator <= 0) continue;
    const name = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    headers.set(name, [...(headers.get(name) ?? []), value]);
    lastName = name;
  }

  return headers;
}

function cookieAttributes(parts: string[]): Map<string, string | true> {
  const attributes = new Map<string, string | true>();
  for (const part of parts) {
    const separator = part.indexOf('=');
    const name = (separator < 0 ? part : part.slice(0, separator)).trim().toLowerCase();
    if (!name) continue;
    attributes.set(name, separator < 0 ? true : part.slice(separator + 1).trim());
  }
  return attributes;
}

function inspectSetCookie(value: string): CookieInspection | null {
  const parts = value.split(';').map(part => part.trim()).filter(Boolean);
  const first = parts.shift();
  const separator = first?.indexOf('=') ?? -1;
  if (!first || separator <= 0) return null;

  const name = first.slice(0, separator).trim();
  const attributes = cookieAttributes(parts);
  const visibleAttributes = parts.map(part => part.replace(/=.*/, '')).filter(Boolean);
  const findings: PrivacyFinding[] = [];
  const sameSite = attributes.get('samesite');
  const maxAge = attributes.get('max-age');

  if (TRACKING_COOKIE.test(name)) {
    findings.push(finding('medium', 'Possible analytics identifier', 'The cookie name matches a common analytics or advertising pattern. Confirm that it is necessary and document its retention.'));
  }
  if (!attributes.has('secure')) {
    findings.push(finding('medium', 'Secure is missing', 'The browser may send this cookie over an HTTP connection if one is reachable. Add Secure for HTTPS-only sites.'));
  }
  if (!attributes.has('httponly')) {
    findings.push(finding('medium', 'HttpOnly is missing', 'Page JavaScript can read this cookie. That may be intentional, but session cookies should normally be protected from script access.'));
  }
  if (!sameSite) {
    findings.push(finding('low', 'SameSite is not explicit', 'Modern browsers commonly default to Lax, but an explicit SameSite value makes cross-site behavior clearer and more consistent.'));
  } else if (String(sameSite).toLowerCase() === 'none' && !attributes.has('secure')) {
    findings.push(finding('high', 'SameSite=None without Secure', 'Browsers reject this combination. Cross-site cookies must also be marked Secure.'));
  }
  if (attributes.has('domain')) {
    findings.push(finding('low', 'Broad domain scope', 'A Domain attribute can make the cookie available to subdomains. Omit it unless that sharing is required.'));
  }
  if (typeof maxAge === 'string' && Number(maxAge) > 60 * 60 * 24 * 30) {
    findings.push(finding('low', 'Long-lived identifier', 'Max-Age exceeds 30 days. Review whether this retention period is necessary for the cookie’s purpose.'));
  }
  if (name.startsWith('__Host-') && (!attributes.has('secure') || attributes.get('path') !== '/' || attributes.has('domain'))) {
    findings.push(finding('high', '__Host- prefix rules are not met', '__Host- cookies must use Secure, Path=/, and no Domain attribute.'));
  }
  if (name.startsWith('__Secure-') && !attributes.has('secure')) {
    findings.push(finding('high', '__Secure- prefix rule is not met', '__Secure- cookies must include the Secure attribute.'));
  }

  return {name, attributes: visibleAttributes, source: 'Set-Cookie', findings};
}

function inspectRequestCookie(value: string): CookieInspection[] {
  return value.split(';').flatMap(part => {
    const separator = part.indexOf('=');
    const name = part.slice(0, separator).trim();
    if (separator <= 0 || !name) return [];
    return [{
      name,
      attributes: [],
      source: 'Cookie' as const,
      findings: [finding('info', 'Attributes are not present in request headers', 'Paste Set-Cookie response headers to inspect Secure, HttpOnly, SameSite, scope and retention.')],
    }];
  });
}

export function inspectCookies(raw: string): CookieReport {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error('Paste a Cookie or Set-Cookie header.');

  const headers = parseHeaderLines(trimmed);
  const setCookieValues = headers.get('set-cookie') ?? [];
  const requestCookieValues = headers.get('cookie') ?? [];
  const cookies = setCookieValues.length > 0
    ? setCookieValues.flatMap(value => {
      const inspected = inspectSetCookie(value);
      return inspected ? [inspected] : [];
    })
    : requestCookieValues.length > 0
      ? requestCookieValues.flatMap(inspectRequestCookie)
      : [inspectSetCookie(trimmed)].filter((cookie): cookie is CookieInspection => cookie !== null);

  if (cookies.length === 0) throw new Error('No valid cookie pair was found. Use name=value, Cookie:, or Set-Cookie:.');

  const setCookies = cookies.filter(cookie => cookie.source === 'Set-Cookie');
  return {
    cookies,
    stats: {
      setCookies: setCookies.length,
      requestCookies: cookies.length - setCookies.length,
      likelyTracking: setCookies.filter(cookie => TRACKING_COOKIE.test(cookie.name)).length,
      weakConfigurations: setCookies.reduce((total, cookie) => total + cookie.findings.filter(item => item.severity === 'high' || item.severity === 'medium').length, 0),
    },
  };
}

function safeHeaderValue(value: string): string {
  return value
    .replace(/'nonce-[^']*'/gi, "'nonce-[redacted]'")
    .replace(/'sha(?:256|384|512)-[^']*'/gi, "'sha[redacted]'")
    .slice(0, 360);
}

function hasOpenDirective(policy: string, directive: string): boolean {
  const match = policy.match(new RegExp(`(?:^|;)\\s*${directive}\\s+([^;]+)`, 'i'));
  return Boolean(match?.[1].includes('*'));
}

export function inspectResponseHeaders(raw: string): HeaderReport {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error('Paste HTTP response headers.');

  const parsed = parseHeaderLines(trimmed);
  if (parsed.size === 0) throw new Error('No HTTP headers were found. Paste one header per line, for example Referrer-Policy: no-referrer.');

  const value = (name: string) => (parsed.get(name) ?? []).join(', ');
  const referrer = value('referrer-policy').toLowerCase();
  const permissions = value('permissions-policy').toLowerCase();
  const csp = value('content-security-policy');
  const cspLower = csp.toLowerCase();
  const cacheControl = value('cache-control').toLowerCase();
  const allowOrigin = value('access-control-allow-origin').toLowerCase();
  const allowCredentials = value('access-control-allow-credentials').toLowerCase();
  const findings: PrivacyFinding[] = [];

  if (!referrer) {
    findings.push(finding('medium', 'Referrer-Policy is missing', 'Links can reveal more of the current URL than intended. Set a deliberate policy, such as strict-origin-when-cross-origin or no-referrer.'));
  } else if (referrer.includes('unsafe-url')) {
    findings.push(finding('high', 'Referrer policy exposes full URLs', 'unsafe-url can send full paths and query parameters to other origins. Avoid it for pages with sensitive identifiers.'));
  } else if (referrer.includes('no-referrer')) {
    findings.push(finding('info', 'Referrers are blocked', 'The policy prevents the browser from sending the referring URL to the next site.'));
  } else {
    findings.push(finding('info', 'Referrer policy is set', 'The response defines a referrer policy. Review it against the sensitivity of URL paths and query parameters.'));
  }

  if (!permissions) {
    findings.push(finding('low', 'Permissions-Policy is missing', 'A policy can prevent embedded or injected content from requesting capabilities such as camera, microphone and geolocation.'));
  } else {
    const blocked = ['camera', 'microphone', 'geolocation'].filter(name => new RegExp(`${name}\\s*=\\s*\\(\\s*\\)`).test(permissions));
    if (blocked.length > 0) {
      findings.push(finding('info', 'Sensitive browser capabilities are disabled', `${blocked.join(', ')} ${blocked.length === 1 ? 'is' : 'are'} blocked by Permissions-Policy.`));
    }
    const widelyAllowed = ['camera', 'microphone', 'geolocation'].filter(name => new RegExp(`${name}\\s*=\\s*\\*`).test(permissions));
    if (widelyAllowed.length > 0) {
      findings.push(finding('medium', 'Sensitive capability allowed to all origins', `${widelyAllowed.join(', ')} ${widelyAllowed.length === 1 ? 'is' : 'are'} delegated with *. Restrict this to explicitly trusted origins.`));
    }
  }

  if (!csp) {
    findings.push(finding('medium', 'Content-Security-Policy is missing', 'A CSP can limit injected scripts, third-party connections and tracking pixels. Add one before relying on client-side privacy controls.'));
  } else {
    if (hasOpenDirective(csp, 'connect-src') || hasOpenDirective(csp, 'default-src')) {
      findings.push(finding('low', 'Outbound connections are broadly allowed', 'connect-src or default-src permits any origin. Restrict connections to the services the page actually needs.'));
    }
    if (hasOpenDirective(csp, 'img-src')) {
      findings.push(finding('low', 'Images may load from any origin', 'An unrestricted img-src can allow third-party tracking pixels. Limit it where practical.'));
    }
    if (hasOpenDirective(csp, 'script-src') || /script-src[^;]*(?:'unsafe-inline'|'unsafe-eval')/i.test(csp)) {
      findings.push(finding('medium', 'Script policy is permissive', 'Broad script sources or unsafe script execution weaken protection against injected tracking and data exfiltration.'));
    }
    if (TRACKER_DOMAIN.test(cspLower)) {
      findings.push(finding('info', 'Known analytics domain allowed by CSP', 'The policy explicitly permits a common analytics or advertising domain. Confirm that it matches the site’s privacy commitments.'));
    }
  }

  if (cacheControl.includes('no-store')) {
    findings.push(finding('info', 'Response is not stored', 'Cache-Control: no-store helps prevent sensitive response data from being retained in browser or intermediary caches.'));
  } else if (cacheControl.includes('public')) {
    findings.push(finding('medium', 'Response can be shared by caches', 'Cache-Control: public is risky for personalized or sensitive pages. Use private or no-store where appropriate.'));
  } else if (!cacheControl) {
    findings.push(finding('low', 'No cache policy is declared', 'For pages containing private data, explicitly choose private or no-store instead of relying on defaults.'));
  }

  if (value('clear-site-data')) {
    findings.push(finding('info', 'Clear-Site-Data is available', 'The response can ask the browser to clear local site data, which is useful during sign-out or account deletion.'));
  }
  if (allowOrigin === '*' && allowCredentials === 'true') {
    findings.push(finding('high', 'Invalid credentialed wildcard CORS configuration', 'Browsers reject Access-Control-Allow-Origin: * with credentials. Use an explicit trusted origin and Vary: Origin.'));
  } else if (allowOrigin === '*') {
    findings.push(finding('low', 'CORS allows every origin', 'Any website can read this response when it contains no credentials. Confirm that the data is intended to be public.'));
  }
  if (value('server') || value('x-powered-by')) {
    findings.push(finding('low', 'Server implementation is disclosed', 'Server or X-Powered-By reveals implementation details. Remove these headers when they do not serve a diagnostic need.'));
  }
  if ((parsed.get('set-cookie') ?? []).length > 0) {
    findings.push(finding('info', 'Set-Cookie headers found', 'Use Cookie Inspector to review cookie scope, lifetime and flags without exposing their values in the results.'));
  }

  if (findings.length === 0) {
    findings.push(finding('info', 'No obvious privacy issues found', 'This is a heuristic review of pasted response headers. Verify the complete application behavior before relying on it.'));
  }

  return {
    headers: DISPLAYED_HEADERS.flatMap(name => (parsed.get(name) ?? []).map(item => ({name, value: safeHeaderValue(item)}))),
    findings,
    stats: {
      headers: parsed.size,
      setCookies: (parsed.get('set-cookie') ?? []).length,
    },
  };
}
