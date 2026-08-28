import { scanPii } from './piiScan';

function hashSync(input: string, salt: string): string {
  let h = 0x811c9dc5;
  const data = `${salt}:${input}`;
  for (let i = 0; i < data.length; i++) {
    h ^= data.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export interface FreePseudonymizeOptions {
  salt: string;
  pseudonymizeEmails: boolean;
  pseudonymizePhones: boolean;
  pseudonymizeNames: boolean; // capitalised words heuristic
  pseudonymizeIps: boolean;
}

export const DEFAULT_FREE_OPTIONS: FreePseudonymizeOptions = {
  salt: 'local-salt',
  pseudonymizeEmails: true,
  pseudonymizePhones: true,
  pseudonymizeNames: false,
  pseudonymizeIps: true,
};

export interface FreePseudonymizeResult {
  output: string;
  replacements: number;
  mapping: Record<string, string>;
}

export function pseudonymizeFreeText(input: string, options: FreePseudonymizeOptions): FreePseudonymizeResult {
  const mapping: Record<string, string> = {};
  const cache = new Map<string, string>();
  let replacements = 0;

  const getPseudo = (original: string, prefix: string): string => {
    const key = `${options.salt}:${original}`;
    if (cache.has(key)) return cache.get(key)!;
    const pseudo = `${prefix}_${hashSync(original, options.salt).slice(0, 6)}`;
    cache.set(key, pseudo);
    mapping[original] = pseudo;
    return pseudo;
  };

  let out = input;

  if (options.pseudonymizeEmails) {
    const re = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
    out = out.replace(re, m => {
      replacements++;
      // keep domain TLD but pseudonymize local
      const [local, domain] = m.split('@');
      const pseudoLocal = getPseudo(local, 'user');
      const domainPseudo = domain.includes('.') ? domain.split('.').slice(-1)[0] : 'invalid';
      return `${pseudoLocal}@example.${domainPseudo}`;
    });
  }

  if (options.pseudonymizePhones) {
    const re = /(?<!\w)(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?){2,4}\d{2,4}(?!\w)/g;
    out = out.replace(re, m => {
      const digits = m.replace(/\D/g, '');
      if (digits.length < 10) return m;
      replacements++;
      return getPseudo(m, 'phone');
    });
  }

  if (options.pseudonymizeIps) {
    const re = /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d?\d)\b/g;
    out = out.replace(re, m => {
      replacements++;
      return getPseudo(m, 'ip');
    });
  }

  if (options.pseudonymizeNames) {
    // heuristic: 2+ consecutive Capitalised words (e.g., "Ana Silva")
    const re = /\b([A-Z][a-z]{2,}\s+[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})?)\b/g;
    out = out.replace(re, m => {
      // avoid pseudonymizing common sentence starts: filter if word is in stoplist
      const stop = new Set(['The', 'This', 'That', 'These', 'Those', 'Hello', 'Please', 'Thank']);
      if (stop.has(m.split(' ')[0])) return m;
      replacements++;
      return getPseudo(m, 'person');
    });
  }

  return { output: out, replacements, mapping };
}

export function previewPiiKinds(input: string): string[] {
  return scanPii(input).map(f => f.label);
}
