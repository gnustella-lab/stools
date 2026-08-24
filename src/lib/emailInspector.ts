export type Severity = 'high' | 'medium' | 'low' | 'info';

export interface Finding {
  severity: Severity;
  title: string;
  detail: string;
  evidence?: string;
}

export interface EmailInspection {
  headers: Record<string, string>;
  bodySnippet: string;
  findings: Finding[];
  stats: {
    externalImages: number;
    trackingParams: number;
    links: number;
  };
}

const TRACKING_DOMAIN_HINTS = [
  'open',
  'track',
  'pixel',
  'beacon',
  'analytics',
  'utm_',
  'mailopen',
  'click',
  'mandrill',
  'sendgrid',
  'mailgun',
  'mailchimp',
  'hubspot',
  'marketo',
  'eloqua',
];

function parseHeaders(raw: string): {headers: Record<string, string>; body: string} {
  const lines = raw.split(/\r?\n/);
  const headers: Record<string, string> = {};
  let currentKey: string | null = null;
  let headerEnd = lines.length;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') {
      headerEnd = i + 1;
      break;
    }
    if (/^\s/.test(line) && currentKey) {
      headers[currentKey] += ' ' + line.trim();
      continue;
    }
    const idx = line.indexOf(':');
    if (idx > 0) {
      const key = line.slice(0, idx).trim().toLowerCase();
      const value = line.slice(idx + 1).trim();
      headers[key] = value;
      currentKey = key;
    }
  }
  const body = lines.slice(headerEnd).join('\n');
  return {headers, body};
}

function extractLinks(html: string): string[] {
  const links: string[] = [];
  const hrefRe = /href\s*=\s*["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = hrefRe.exec(html))) links.push(m[1]);
  const srcRe = /src\s*=\s*["']([^"']+)["']/gi;
  while ((m = srcRe.exec(html))) links.push(m[1]);
  return links;
}

function countTrackingParams(url: string): number {
  try {
    const u = new URL(url, 'http://example.invalid');
    let count = 0;
    for (const key of u.searchParams.keys()) {
      const lower = key.toLowerCase();
      if (lower.startsWith('utm_') || ['fbclid', 'gclid', 'msclkid', 'igshid', 'ttclid', 'wbraid', 'gbraid', 'yclid', 'dclid', '_hsenc', '_hsmi', 'mkt_tok', 'vero_id'].includes(lower)) count++;
    }
    return count;
  } catch {
    return 0;
  }
}

export function inspectEmail(raw: string): EmailInspection {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error('Paste an email header or .eml content.');
  const {headers, body} = parseHeaders(trimmed);
  const findings: Finding[] = [];

  const hasHtml = /<html|<body|<img|<a\s/i.test(body);
  const headersToCheck = ['from', 'reply-to', 'return-path', 'dkim-signature', 'spf', 'authentication-results', 'list-unsubscribe', 'precedence', 'x-mailer'];

  // Header mismatch
  const from = headers['from'] ?? '';
  const returnPath = headers['return-path'] ?? '';
  const replyTo = headers['reply-to'] ?? '';
  if (from && returnPath && !returnPath.includes(from.replaceAll('"', '').split('<')[1]?.replace('>', '') ?? '')) {
    // simple domain mismatch check
    const fromDomain = from.match(/@([a-z0-9.-]+\.[a-z]{2,})/i)?.[1]?.toLowerCase();
    const returnDomain = returnPath.match(/@([a-z0-9.-]+\.[a-z]{2,})/i)?.[1]?.toLowerCase();
    if (fromDomain && returnDomain && fromDomain !== returnDomain) {
      findings.push({
        severity: 'medium',
        title: 'Return-Path domain mismatch',
        detail: `From domain (${fromDomain}) differs from Return-Path (${returnDomain}) - common in forwarded or spoofed mail.`,
        evidence: `From: ${from} | Return-Path: ${returnPath}`,
      });
    }
  }
  if (replyTo && from) {
    const replyDomain = replyTo.match(/@([a-z0-9.-]+\.[a-z]{2,})/i)?.[1]?.toLowerCase();
    const fromDomain = from.match(/@([a-z0-9.-]+\.[a-z]{2,})/i)?.[1]?.toLowerCase();
    if (replyDomain && fromDomain && replyDomain !== fromDomain) {
      findings.push({
        severity: 'medium',
        title: 'Reply-To points elsewhere',
        detail: `Replies will go to ${replyDomain}, not ${fromDomain}. Verify this is expected.`,
        evidence: replyTo,
      });
    }
  }

  const auth = headers['authentication-results'] ?? headers['dkim-signature'] ?? '';
  if (!auth && Object.keys(headers).length > 3) {
    findings.push({
      severity: 'low',
      title: 'No authentication results',
      detail: 'No DKIM/SPF Authentication-Results header found. The message may be unauthenticated - treat links with caution.',
    });
  } else if (auth.toLowerCase().includes('fail')) {
    findings.push({
      severity: 'high',
      title: 'Authentication failure',
      detail: 'SPF, DKIM or DMARC reported failure in Authentication-Results - possible spoofing.',
      evidence: auth.slice(0, 200),
    });
  }

  const precedence = headers['precedence']?.toLowerCase() ?? '';
  const listUnsub = headers['list-unsubscribe'] ?? '';
  if (precedence === 'bulk' || listUnsub) {
    findings.push({
      severity: 'info',
      title: 'Bulk / marketing mail',
      detail: 'Precedence: bulk or List-Unsubscribe present - this is mass mail. Extra tracking is likely.',
      evidence: listUnsub || precedence,
    });
  }

  // Extract images and links from body
  const imgRe = /<img[^>]*>/gi;
  const imgs = body.match(imgRe) ?? [];
  let tinyImgs = 0;
  let trackingImgs = 0;
  for (const tag of imgs) {
    const lower = tag.toLowerCase();
    const isTiny = /width\s*=\s*["']?1["']?/.test(lower) || /height\s*=\s*["']?1["']?/.test(lower) || /1px/.test(lower);
    const hasTrackingHint = TRACKING_DOMAIN_HINTS.some(h => lower.includes(h));
    if (isTiny) tinyImgs++;
    if (hasTrackingHint) trackingImgs++;
    if (isTiny || hasTrackingHint) {
      findings.push({
        severity: isTiny ? 'high' : 'medium',
        title: isTiny ? '1×1 tracking pixel detected' : 'Suspicious tracking image',
        detail: isTiny
          ? 'A 1×1 image is used to confirm you opened this email - it can leak IP, time and device.'
          : 'Image URL contains tracking hints (open/track/pixel/analytics).',
        evidence: tag.slice(0, 200),
      });
    }
  }

  const links = extractLinks(body);
  let trackingParamCount = 0;
  const suspiciousLinks: string[] = [];
  for (const url of links) {
    const c = countTrackingParams(url);
    trackingParamCount += c;
    const lower = url.toLowerCase();
    if (TRACKING_DOMAIN_HINTS.some(h => lower.includes(h)) || c > 0) {
      suspiciousLinks.push(url);
    }
  }
  if (suspiciousLinks.length > 0) {
    findings.push({
      severity: 'medium',
      title: `Tracking parameters in ${suspiciousLinks.length} link(s)`,
      detail: 'Links contain utm_*, fbclid, gclid or known tracker domains. They can identify you across sites. Use Link Cleaner before clicking.',
      evidence: suspiciousLinks.slice(0, 3).join('\n'),
    });
  }

  const xMailer = headers['x-mailer'] ?? headers['x-mailgun-sending-ip'] ?? '';
  if (xMailer) {
    findings.push({
      severity: 'info',
      title: 'Mailer fingerprint',
      detail: `X-Mailer reveals the sending software: ${xMailer.slice(0, 120)} - useful to verify bulk senders.`,
    });
  }

  const receivedRawCount = (raw.match(/^Received:/gim) ?? []).length;
  if (receivedRawCount > 0) {
    findings.push({
      severity: 'info',
      title: `${receivedRawCount} hop(s) in Received chain`,
      detail: 'Each Received header is a server that handled the mail. Many hops can hide origin; check the bottom-most Received for true sender IP.',
    });
  }

  if (findings.length === 0) {
    findings.push({
      severity: 'info',
      title: 'No obvious trackers found',
      detail: hasHtml
        ? 'No 1×1 pixels, tracking params or auth failures detected in the pasted content. Review manually before clicking links.'
        : 'Paste the full raw source (headers + HTML body) for deeper inspection.',
    });
  }

  const filteredHeaders: Record<string, string> = {};
  for (const k of headersToCheck) if (headers[k]) filteredHeaders[k] = headers[k];
  // include any header if few
  if (Object.keys(filteredHeaders).length === 0) {
    for (const [k, v] of Object.entries(headers)) if (Object.keys(filteredHeaders).length < 8) filteredHeaders[k] = v;
  }

  return {
    headers: filteredHeaders,
    bodySnippet: body.slice(0, 600),
    findings,
    stats: {
      externalImages: imgs.length,
      trackingParams: trackingParamCount,
      links: links.length,
    },
  };
}
