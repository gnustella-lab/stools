export type ColumnStrategy =
  | 'keep'
  | 'remove'
  | 'mask'
  | 'pseudonymize'
  | 'hash'
  | 'randomize';

export interface AnonymizeConfig {
  [column: string]: ColumnStrategy;
}

export interface AnonymizeOptions {
  salt: string;
}

export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
}

function hashStringSync(input: string, salt: string): string {
  let hash = 0x811c9dc5;
  const data = `${salt}:${input}`;
  for (let i = 0; i < data.length; i++) {
    hash ^= data.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function maskValue(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) return value;
  if (trimmed.includes('@')) {
    const [local, domain] = trimmed.split('@');
    if (!domain) return '***';
    const maskedLocal =
      local.length <= 2 ? '*'.repeat(local.length) : `${local[0]}***${local[local.length - 1]}`;
    const domainParts = domain.split('.');
    const maskedDomain = domainParts
      .map((part, idx) =>
        idx === domainParts.length - 1 ? part : part.length <= 2 ? '**' : `${part[0]}**${part[part.length - 1]}`,
      )
      .join('.');
    return `${maskedLocal}@${maskedDomain}`;
  }
  if (trimmed.length <= 4) return '*'.repeat(trimmed.length);
  if (trimmed.length <= 8) return `${trimmed.slice(0, 1)}***${trimmed.slice(-1)}`;
  return `${trimmed.slice(0, 2)}${'*'.repeat(Math.max(3, trimmed.length - 4))}${trimmed.slice(-2)}`;
}

function randomToken(length = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < length; i++) out += chars[bytes[i] % chars.length];
  return out;
}

export function parseCsv(text: string): ParsedCsv {
  const lines: string[][] = [];
  let current: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  const pushField = () => {
    current.push(field);
    field = '';
  };
  const pushRow = () => {
    // avoid pushing empty trailing rows
    if (current.length === 1 && current[0] === '' && field === '' && !inQuotes) return;
    pushField();
    lines.push(current);
    current = [];
  };

  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        } else {
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        field += ch;
        i++;
        continue;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
        continue;
      }
      if (ch === ',') {
        pushField();
        i++;
        continue;
      }
      if (ch === '\r') {
        if (text[i + 1] === '\n') i++;
        pushRow();
        i++;
        continue;
      }
      if (ch === '\n') {
        pushRow();
        i++;
        continue;
      }
      field += ch;
      i++;
    }
  }
  pushRow();

  const filtered = lines.filter(row => !(row.length === 1 && row[0].trim() === ''));
  if (filtered.length === 0) return {headers: [], rows: []};
  const headers = filtered[0].map(h => h.trim());
  const rows: Record<string, string>[] = [];
  for (let r = 1; r < filtered.length; r++) {
    const row = filtered[r];
    const obj: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) {
      obj[headers[c]] = row[c] ?? '';
    }
    rows.push(obj);
  }
  return {headers, rows};
}

function escapeCsvValue(value: string): string {
  if (value.includes('"') || value.includes(',') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

export function serializeCsv(headers: string[], rows: Record<string, string>[]): string {
  const lines: string[] = [];
  lines.push(headers.map(escapeCsvValue).join(','));
  for (const row of rows) {
    lines.push(headers.map(h => escapeCsvValue(row[h] ?? '')).join(','));
  }
  return lines.join('\n');
}

export function anonymizeRows(
  rows: Record<string, string>[],
  headers: string[],
  config: AnonymizeConfig,
  options: AnonymizeOptions,
): {rows: Record<string, string>[]; headers: string[]} {
  const outHeaders = headers.filter(h => config[h] !== 'remove');
  const pseudoCache = new Map<string, string>();
  const randomCache = new Map<string, string>();

  const getPseudonym = (original: string): string => {
    const key = `${options.salt}:${original}`;
    if (pseudoCache.has(key)) return pseudoCache.get(key)!;
    const hash = hashStringSync(original, options.salt);
    const pseudo = `anon_${hash.slice(0, 8)}`;
    pseudoCache.set(key, pseudo);
    return pseudo;
  };

  const getRandomized = (original: string): string => {
    if (original.trim() === '') return original;
    const key = original;
    if (randomCache.has(key)) return randomCache.get(key)!;
    const fake = `anon_${randomToken(6)}`;
    randomCache.set(key, fake);
    return fake;
  };

  const outRows = rows.map(row => {
    const out: Record<string, string> = {};
    for (const h of outHeaders) {
      const strategy = config[h] ?? 'keep';
      const value = row[h] ?? '';
      switch (strategy) {
        case 'keep':
          out[h] = value;
          break;
        case 'mask':
          out[h] = value ? maskValue(value) : value;
          break;
        case 'pseudonymize': {
          if (value.trim() === '') out[h] = value;
          else out[h] = getPseudonym(value);
          break;
        }
        case 'hash': {
          if (value.trim() === '') out[h] = value;
          else out[h] = hashStringSync(value, options.salt);
          break;
        }
        case 'randomize': {
          out[h] = getRandomized(value);
          break;
        }
        default:
          out[h] = value;
      }
    }
    return out;
  });

  return {rows: outRows, headers: outHeaders};
}

export function anonymizeCsv(
  csvText: string,
  config: AnonymizeConfig,
  options: AnonymizeOptions,
): string {
  const parsed = parseCsv(csvText);
  if (parsed.headers.length === 0) throw new Error('No headers found in CSV.');
  const {rows, headers} = anonymizeRows(parsed.rows, parsed.headers, config, options);
  return serializeCsv(headers, rows);
}

export function anonymizeJson(
  jsonText: string,
  config: AnonymizeConfig,
  options: AnonymizeOptions,
): string {
  const trimmed = jsonText.trim();
  if (!trimmed) throw new Error('Empty JSON.');
  const parsed: unknown = JSON.parse(trimmed);
  const isArray = Array.isArray(parsed);
  const rows: Record<string, string>[] = isArray
    ? (parsed as Record<string, unknown>[]).map(obj => {
        const rec: Record<string, string> = {};
        for (const [k, v] of Object.entries(obj)) rec[k] = v == null ? '' : String(v);
        return rec;
      })
    : [Object.fromEntries(Object.entries(parsed as Record<string, unknown>).map(([k, v]) => [k, v == null ? '' : String(v)]))];

  if (rows.length === 0) throw new Error('JSON array is empty.');
  const headers = Object.keys(rows[0]);
  const {rows: outRows, headers: outHeaders} = anonymizeRows(rows, headers, config, options);
  const outObjects = outRows.map(r => {
    const o: Record<string, string> = {};
    for (const h of outHeaders) o[h] = r[h];
    return o;
  });
  return JSON.stringify(isArray ? outObjects : outObjects[0], null, 2);
}

export function inferStrategies(headers: string[]): AnonymizeConfig {
  const sensitiveHints = ['email', 'e-mail', 'mail', 'phone', 'tel', 'cpf', 'cnpj', 'name', 'nome', 'address', 'endereco', 'city', 'cidade', 'ip', 'card', 'token', 'secret', 'password', 'senha', 'dob', 'birth', 'nascimento', 'gps', 'lat', 'lon', 'rg'];
  const config: AnonymizeConfig = {};
  for (const h of headers) {
    const lower = h.toLowerCase();
    if (sensitiveHints.some(hint => lower.includes(hint))) {
      config[h] = 'pseudonymize';
    } else {
      config[h] = 'keep';
    }
  }
  return config;
}
