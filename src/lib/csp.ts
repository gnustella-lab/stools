export type CspDirective =
  | 'default-src'
  | 'script-src'
  | 'style-src'
  | 'img-src'
  | 'connect-src'
  | 'font-src'
  | 'frame-src'
  | 'frame-ancestors'
  | 'base-uri'
  | 'form-action'
  | 'object-src';

export const CSP_DIRECTIVES: CspDirective[] = [
  'default-src',
  'script-src',
  'style-src',
  'img-src',
  'connect-src',
  'font-src',
  'frame-src',
  'frame-ancestors',
  'base-uri',
  'form-action',
  'object-src',
];

export const CSP_KEYWORDS = [
  "'self'",
  "'none'",
  "'strict-dynamic'",
  "'unsafe-inline'",
  "'unsafe-eval'",
  "'unsafe-hashes'",
  "'report-sample'",
] as const;

export interface CspConfig {
  directives: Record<CspDirective, string[]>;
  upgradeInsecureRequests: boolean;
  blockAllMixedContent: boolean;
  requireTrustedTypesFor?: string[];
}

export function emptyCspConfig(): CspConfig {
  const directives = {} as Record<CspDirective, string[]>;
  for (const d of CSP_DIRECTIVES) directives[d] = [];
  directives['default-src'] = ["'self'"];
  directives['object-src'] = ["'none'"];
  directives['base-uri'] = ["'self'"];
  directives['frame-ancestors'] = ["'self'"];
  return { directives, upgradeInsecureRequests: false, blockAllMixedContent: false };
}

export function buildCspHeader(config: CspConfig): string {
  const parts: string[] = [];
  for (const d of CSP_DIRECTIVES) {
    const values = config.directives[d];
    if (values && values.length > 0) {
      parts.push(`${d} ${values.join(' ')}`);
    }
  }
  if (config.upgradeInsecureRequests) parts.push('upgrade-insecure-requests');
  if (config.blockAllMixedContent) parts.push('block-all-mixed-content');
  if (config.requireTrustedTypesFor && config.requireTrustedTypesFor.length > 0) {
    parts.push(`require-trusted-types-for '${config.requireTrustedTypesFor.join("' '")}'`);
  }
  return parts.join('; ');
}

export function validateCsp(header: string): string[] {
  const warnings: string[] = [];
  if (header.includes("'unsafe-inline'") && !header.includes("'nonce-") && !header.includes("'strict-dynamic'")) {
    warnings.push("Avoid 'unsafe-inline' without a nonce or 'strict-dynamic' — it weakens XSS protection.");
  }
  if (header.includes("'unsafe-eval'")) warnings.push("'unsafe-eval' allows eval() — remove if possible.");
  if (!header.includes('object-src')) warnings.push("Add object-src 'none' to block plugins.");
  if (!header.includes('base-uri')) warnings.push("Add base-uri 'self' to prevent base hijacking.");
  if (header.includes('*') && !header.includes('*.')) warnings.push("Wildcard '*' is overly permissive.");
  if (!header.includes('frame-ancestors')) warnings.push("Consider frame-ancestors 'self' to mitigate clickjacking.");
  return warnings;
}

export function generateNonce(bytes = 16): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  let binary = '';
  arr.forEach(b => (binary += String.fromCharCode(b)));
  return btoa(binary);
}
