export type PiiKind = 'email' | 'phone' | 'card' | 'jwt' | 'pem' | 'ipv4' | 'iban' | 'apiToken' | 'awsKey';

export interface PiiFinding {
  kind: PiiKind;
  label: string;
  count: number;
  samples: string[];
  severity: 'high' | 'medium' | 'low';
}

const PATTERNS: { kind: PiiKind; label: string; re: RegExp; severity: 'high' | 'medium' | 'low'; sampleLen: number }[] = [
  { kind: 'email', label: 'Email addresses', re: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, severity: 'high', sampleLen: 3 },
  { kind: 'phone', label: 'Phone numbers', re: /(?<!\w)(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?){2,4}\d{2,4}(?!\w)/g, severity: 'medium', sampleLen: 3 },
  { kind: 'card', label: 'Payment card numbers', re: /\b(?:\d[ -]*?){13,19}\b/g, severity: 'high', sampleLen: 2 },
  { kind: 'jwt', label: 'JSON Web Tokens', re: /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, severity: 'high', sampleLen: 2 },
  { kind: 'pem', label: 'PEM private keys', re: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g, severity: 'high', sampleLen: 1 },
  { kind: 'ipv4', label: 'IPv4 addresses', re: /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d?\d)\b/g, severity: 'medium', sampleLen: 3 },
  { kind: 'iban', label: 'IBAN', re: /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/g, severity: 'high', sampleLen: 3 },
  { kind: 'apiToken', label: 'API / Bearer tokens', re: /\b(?:Bearer\s+[A-Za-z0-9._\-+=/]{12,}|sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{20,}|xox[baprs]-[A-Za-z0-9-]{10,})\b/g, severity: 'high', sampleLen: 2 },
  { kind: 'awsKey', label: 'AWS access keys (AKIA/ASIA)', re: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g, severity: 'high', sampleLen: 2 },
];

function maskSample(s: string): string {
  if (s.length <= 6) return s[0] + '***' + s.slice(-1);
  return s.slice(0, 3) + '***' + s.slice(-3);
}

export function scanPii(text: string): PiiFinding[] {
  const findings: PiiFinding[] = [];
  for (const p of PATTERNS) {
    // reset lastIndex for global
    const re = new RegExp(p.re.source, p.re.flags);
    const matches: string[] = (text.match(re) ?? []) as string[];
    if (matches.length > 0) {
      // extra filter for card: luhn-ish or skip false positives (e.g., 13 digits all same)
      let filtered = matches;
      if (p.kind === 'card') {
        filtered = matches.filter(m => {
          const digits = m.replace(/\D/g, '');
          if (digits.length < 13 || digits.length > 19) return false;
          // skip repeated digits
          if (/^(\d)\1+$/.test(digits)) return false;
          return true;
        });
        if (filtered.length === 0) continue;
      }
      if (p.kind === 'iban') {
        filtered = filtered.filter(m => m.length >= 15 && m.length <= 34);
        if (filtered.length === 0) continue;
      }
      findings.push({
        kind: p.kind,
        label: p.label,
        count: filtered.length,
        samples: filtered.slice(0, p.sampleLen).map(maskSample),
        severity: p.severity,
      });
    }
  }
  return findings;
}

export function piiRiskScore(findings: PiiFinding[]): { score: number; level: 'low' | 'medium' | 'high' | 'critical' } {
  let score = 0;
  for (const f of findings) {
    const weight = f.severity === 'high' ? 25 : f.severity === 'medium' ? 12 : 5;
    score += Math.min(f.count, 5) * weight;
  }
  score = Math.min(100, score);
  let level: 'low' | 'medium' | 'high' | 'critical' = 'low';
  if (score >= 75) level = 'critical';
  else if (score >= 45) level = 'high';
  else if (score >= 15) level = 'medium';
  return { score, level };
}
