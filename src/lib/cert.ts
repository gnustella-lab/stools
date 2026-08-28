export interface CertInfo {
  subject: string;
  issuer: string;
  notBefore: string | null;
  notAfter: string | null;
  san: string[];
  serialHex: string | null;
  sigAlg: string | null;
  publicKeyAlg: string | null;
  keySizeHint: string | null;
  fingerprintSha256: string;
  isExpired: boolean | null;
  isNotYetValid: boolean | null;
  warnings: string[];
}

function pemToBytes(pem: string): Uint8Array {
  const b64 = pem
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/\s+/g, '');
  if (!b64) throw new Error('No Base64 content found in PEM.');
  const binary = atob(b64);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map(b => b.toString(16).padStart(2, '0')).join(':');
}

function tryParseOidName(bytes: Uint8Array): string {
  // very small heuristic: extract printable strings near OID 2.5.4.x
  const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  // Extract sequences that look like CN=..., O=..., etc from text
  const matches = text.match(/(CN|O|OU|C|ST|L|emailAddress)=[^\x00-\x1F\x7F]+/g);
  if (matches) return matches.join(', ');
  // fallback: printable substrings
  const printable = text.replace(/[^\x20-\x7E,=.\-@]+/g, ' ').trim().slice(0, 400);
  return printable || '—';
}

function extractSans(bytes: Uint8Array): string[] {
  const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  // SANs appear as clear text dNSName / iPAddress blobs: heuristic search for domains / ips
  const domainRe = /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}\b/gi;
  const raw = text.match(domainRe) ?? [];
  // deduplicate, keep plausible SANs (contains dot, not too long)
  const uniq = [...new Set(raw.map(s => s.toLowerCase()))].filter(s => s.length < 253 && s.includes('.'));
  // Filter out issuer-like domains that appear in cert metadata noise: keep top 20
  return uniq.slice(0, 20);
}

function detectSigAlg(bytes: Uint8Array): string | null {
  const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  // OID name hints
  if (text.includes('1.2.840.113549.1.1.11')) return 'sha256WithRSAEncryption (1.2.840.113549.1.1.11)';
  if (text.includes('1.2.840.113549.1.1.12')) return 'sha384WithRSAEncryption';
  if (text.includes('1.2.840.113549.1.1.13')) return 'sha512WithRSAEncryption';
  if (text.includes('1.2.840.10045.4.3.2')) return 'ecdsa-with-SHA256';
  if (text.includes('1.2.840.10045.4.3.3')) return 'ecdsa-with-SHA384';
  return null;
}

function detectPubKey(bytes: Uint8Array): { alg: string | null; hint: string | null } {
  const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  if (text.includes('1.2.840.113549.1.1.1')) return { alg: 'RSA', hint: bytes.length > 800 ? '~2048+ bits (estimate)' : '≤1024 bits (estimate, heuristic)' };
  if (text.includes('1.2.840.10045.2.1')) return { alg: 'EC', hint: 'P-256 / P-384 (heuristic)' };
  if (text.includes('1.3.101.112')) return { alg: 'Ed25519', hint: null };
  return { alg: null, hint: null };
}

// Extract UTCTime / GeneralizedTime strings like 230101000000Z or 20230101000000Z
function extractTimes(bytes: Uint8Array): { notBefore: string | null; notAfter: string | null } {
  const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  // find sequences ending with Z that are 13 or 15 chars and digits
  const times = text.match(/\d{12,14}Z/g) ?? [];
  const toIso = (s: string): string | null => {
    try {
      // UTCTime: YYMMDDhhmmssZ (13) or GeneralizedTime: YYYYMMDDhhmmssZ (15)
      let iso: string;
      if (s.length === 13) {
        const yy = parseInt(s.slice(0, 2), 10);
        const yyyy = yy >= 50 ? 1900 + yy : 2000 + yy;
        iso = `${yyyy}-${s.slice(2, 4)}-${s.slice(4, 6)}T${s.slice(6, 8)}:${s.slice(8, 10)}:${s.slice(10, 12)}Z`;
      } else if (s.length === 15) {
        iso = `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(8, 10)}:${s.slice(10, 12)}:${s.slice(12, 14)}Z`;
      } else return null;
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return null;
      return d.toISOString();
    } catch {
      return null;
    }
  };
  const parsed = times.map(toIso).filter(Boolean) as string[];
  // Heuristic: first two times are notBefore/notAfter
  return { notBefore: parsed[0] ?? null, notAfter: parsed[1] ?? null };
}

export async function inspectCertificate(pemOrDer: string | Uint8Array): Promise<CertInfo> {
  const bytes = typeof pemOrDer === 'string' ? pemToBytes(pemOrDer) : pemOrDer;
  if (bytes.length < 100) throw new Error('Certificate too short.');
  if (bytes.length > 20_000) throw new Error('Certificate too large (max ~20KB).');

  // fingerprint
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes as unknown as ArrayBuffer));
  const fingerprintSha256 = bytesToHex(digest);

  const subject = tryParseOidName(bytes);
  // heuristic: issuer appears twice; second occurrence is issuer-like — reuse same for now with hint
  const warnings: string[] = [];

  const { notBefore, notAfter } = extractTimes(bytes);
  const now = Date.now();
  let isExpired: boolean | null = null;
  let isNotYetValid: boolean | null = null;
  if (notAfter) {
    isExpired = new Date(notAfter).getTime() < now;
    if (isExpired) warnings.push('Certificate is expired (notAfter in the past).');
  }
  if (notBefore) {
    isNotYetValid = new Date(notBefore).getTime() > now;
    if (isNotYetValid) warnings.push('Certificate not yet valid (notBefore in the future).');
  }
  if (!notBefore || !notAfter) warnings.push('Could not parse validity dates — file may be truncated or not a leaf certificate.');

  const san = extractSans(bytes);
  const sigAlg = detectSigAlg(bytes);
  const { alg: publicKeyAlg, hint: keySizeHint } = detectPubKey(bytes);
  if (sigAlg && sigAlg.includes('sha1')) warnings.push('Weak signature algorithm (SHA-1).');
  if (!sigAlg) warnings.push('Signature algorithm not recognized — heuristic only.');
  if (!publicKeyAlg) warnings.push('Public key algorithm not recognized — heuristic only.');

  // crude cert vs csr detection
  const text = typeof pemOrDer === 'string' ? pemOrDer : '';
  if (text.includes('BEGIN CERTIFICATE REQUEST') || text.includes('BEGIN NEW CERTIFICATE REQUEST')) {
    warnings.push('This looks like a CSR, not a certificate. Subject/validity may be incomplete.');
  }

  return {
    subject,
    issuer: subject, // best-effort single; proper split needs full ASN.1
    notBefore,
    notAfter,
    san,
    serialHex: null,
    sigAlg,
    publicKeyAlg,
    keySizeHint,
    fingerprintSha256,
    isExpired,
    isNotYetValid,
    warnings,
  };
}

export function isPemInput(input: string): boolean {
  return /-----BEGIN [^-]+-----/.test(input);
}
