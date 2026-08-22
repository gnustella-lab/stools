export interface RedactionRule {
  id: string;
  label: string;
  description: string;
  pattern: RegExp;
  replacement: string;
}

export const REDACTION_RULES: RedactionRule[] = [
  {
    id: 'email',
    label: 'Email addresses',
    description: 'Replaces addresses such as name@example.com.',
    pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    replacement: '[REDACTED:email]',
  },
  {
    id: 'phone',
    label: 'Phone numbers',
    description: 'International and local numbers with 10 or more digits.',
    pattern: /(?<!\w)(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?){2,4}\d{2,4}(?!\w)/g,
    replacement: '[REDACTED:phone]',
  },
  {
    id: 'jwt',
    label: 'JSON Web Tokens',
    description: 'Compact JWTs beginning with eyJ.',
    pattern: /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
    replacement: '[REDACTED:jwt]',
  },
  {
    id: 'bearer',
    label: 'Bearer / API tokens',
    description: 'Authorization headers and long high-entropy tokens.',
    pattern:
      /\b(?:Bearer\s+[A-Za-z0-9._\-+=/]{12,}|sk-[A-Za-z0-9]{16,}|ghp_[A-Za-z0-9]{20,}|xox[baprs]-[A-Za-z0-9-]{10,})\b/g,
    replacement: '[REDACTED:token]',
  },
  {
    id: 'aws',
    label: 'Cloud access keys',
    description: 'AWS-style access key IDs (AKIA…).',
    pattern: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g,
    replacement: '[REDACTED:access-key]',
  },
  {
    id: 'card',
    label: 'Payment card numbers',
    description: '13–19 digit sequences that look like card numbers.',
    pattern: /\b(?:\d[ -]*?){13,19}\b/g,
    replacement: '[REDACTED:card]',
  },
  {
    id: 'ipv4',
    label: 'IPv4 addresses',
    description: 'Dotted-quad addresses.',
    pattern: /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d?\d)\b/g,
    replacement: '[REDACTED:ip]',
  },
  {
    id: 'pem',
    label: 'PEM private keys',
    description: 'BEGIN PRIVATE KEY / RSA PRIVATE KEY blocks.',
    pattern:
      /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]+?-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
    replacement: '[REDACTED:private-key]',
  },
];

export interface RedactionResult {
  output: string;
  counts: Record<string, number>;
  total: number;
}

export function redactText(input: string, enabledIds: Set<string>): RedactionResult {
  const counts: Record<string, number> = {};
  let output = input;
  for (const rule of REDACTION_RULES) {
    if (!enabledIds.has(rule.id)) {
      continue;
    }
    const matches = output.match(rule.pattern);
    const count = matches?.length ?? 0;
    counts[rule.id] = count;
    if (count > 0) {
      output = output.replace(rule.pattern, rule.replacement);
    }
  }
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
  return {output, counts, total};
}
