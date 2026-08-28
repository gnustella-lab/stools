const SECRET_KEY_PATTERNS = /token|secret|password|passwd|passphrase|api[_-]?key|apikey|aws|access[_-]?key|client[_-]?secret|private[_-]?key|jwt|bearer|auth|credential|session|cookie/i;

export interface EnvEntry {
  key: string;
  value: string;
  isSecret: boolean;
  line: number;
  raw: string;
}

export interface EnvScrubResult {
  entries: EnvEntry[];
  scrubbed: string;
  secretCount: number;
}

export function parseEnv(text: string): EnvEntry[] {
  const lines = text.split(/\r?\n/);
  const entries: EnvEntry[] = [];
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) continue;
    // handle export prefix
    const withoutExport = trimmed.replace(/^export\s+/, '');
    const eq = withoutExport.indexOf('=');
    if (eq === -1) continue;
    const key = withoutExport.slice(0, eq).trim();
    let value = withoutExport.slice(eq + 1).trim();
    // strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    // handle docker-compose yaml style key: value
    if (!/^[A-Z0-9_]+$/i.test(key) && key.includes(':')) continue;
    const isSecret = SECRET_KEY_PATTERNS.test(key) || looksLikeSecretValue(value);
    entries.push({ key, value, isSecret, line: i + 1, raw });
  }
  return entries;
}

// also parse simple YAML key: value pairs for docker-compose / config
export function parseYamlSecrets(text: string): EnvEntry[] {
  const lines = text.split(/\r?\n/);
  const out: EnvEntry[] = [];
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const m = /^\s*([A-Za-z0-9_\-.]+)\s*:\s*(.+)\s*$/.exec(raw);
    if (!m) continue;
    const key = m[1].trim();
    let value = m[2].trim().replace(/^["']|["']$/g, '');
    if (value.startsWith('${') || value === '""' || value === "''") continue;
    const isSecret = SECRET_KEY_PATTERNS.test(key) || looksLikeSecretValue(value);
    if (isSecret) out.push({ key, value, isSecret, line: i + 1, raw });
  }
  return out;
}

function looksLikeSecretValue(value: string): boolean {
  if (!value) return false;
  if (value.length >= 20 && /^[A-Za-z0-9_\-+=/]{20,}$/.test(value)) return true;
  if (/^sk-[A-Za-z0-9]{20,}/.test(value)) return true;
  if (/^ghp_[A-Za-z0-9]{20,}/.test(value)) return true;
  if (/^(AKIA|ASIA)[A-Z0-9]{16}$/.test(value)) return true;
  return false;
}

export function scrubEnvText(text: string, redact = '[REDACTED]'): EnvScrubResult {
  const envEntries = parseEnv(text);
  const yamlEntries = parseYamlSecrets(text);
  const allKeys = new Set([...envEntries.filter(e => e.isSecret).map(e => e.key), ...yamlEntries.map(e => e.key)]);

  let scrubbed = text;
  for (const key of allKeys) {
    // replace KEY=VALUE or KEY: VALUE
    const reEq = new RegExp(`(^|\\n)(export\\s+)?${escapeRegExp(key)}\\s*=\\s*[^\\r\\n]+`, 'g');
    scrubbed = scrubbed.replace(reEq, (_m, p1, p2) => `${p1}${p2 ?? ''}${key}=${redact}`);
    const reYaml = new RegExp(`(^|\\n)(\\s*${escapeRegExp(key)}\\s*:\\s*)[^\\r\\n]+`, 'g');
    scrubbed = scrubbed.replace(reYaml, (_m, p1, p2) => `${p1}${p2}${redact}`);
  }

  // also redact private key blocks
  const pemRe = /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]+?-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g;
  const pemHits = (scrubbed.match(pemRe) ?? []).length;
  scrubbed = scrubbed.replace(pemRe, '[REDACTED:private-key]');

  const entries = envEntries;
  const secretCount = entries.filter(e => e.isSecret).length + pemHits;
  return { entries, scrubbed, secretCount };
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function toDotEnv(entries: EnvEntry[], redact = '[REDACTED]'): string {
  return entries.map(e => `${e.key}=${e.isSecret ? redact : e.value}`).join('\n');
}
