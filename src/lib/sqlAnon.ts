export type SqlStrategy = 'keep' | 'mask' | 'hash' | 'pseudonymize' | 'redact';

export interface SqlAnonConfig {
  [column: string]: SqlStrategy;
}

export interface SqlAnonOptions {
  salt: string;
}

function hashSync(input: string, salt: string): string {
  let h = 0x811c9dc5;
  const data = `${salt}:${input}`;
  for (let i = 0; i < data.length; i++) {
    h ^= data.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

function maskValue(value: string): string {
  const t = value.trim();
  if (!t) return value;
  if (t.includes('@')) {
    const [local, domain] = t.split('@');
    return `${local[0]}***@${domain}`;
  }
  if (t.length <= 4) return '***';
  return `${t.slice(0, 2)}***${t.slice(-2)}`;
}

export function parseInsertColumns(sql: string): { table: string; columns: string[] } | null {
  // INSERT INTO `users` (id, name, email) VALUES
  const re = /INSERT\s+INTO\s+[`"]?(\w+)[`"]?\s*\(([^)]+)\)\s*VALUES/i;
  const m = re.exec(sql);
  if (!m) return null;
  const table = m[1];
  const cols = m[2].split(',').map(c => c.trim().replace(/^[`"]|[`"]$/g, ''));
  return { table, columns: cols };
}

function splitValuesTuple(tuple: string): string[] {
  // tuple is like "'Alice', 'alice@example.com', 123"
  const parts: string[] = [];
  let cur = '';
  let inSingle = false;
  let inDouble = false;
  let i = 0;
  while (i < tuple.length) {
    const ch = tuple[i];
    if (ch === "'" && !inDouble) {
      if (inSingle && tuple[i + 1] === "'") {
        cur += "''";
        i += 2;
        continue;
      }
      inSingle = !inSingle;
      cur += ch;
    } else if (ch === '"' && !inSingle) {
      inDouble = !inDouble;
      cur += ch;
    } else if (ch === ',' && !inSingle && !inDouble) {
      parts.push(cur.trim());
      cur = '';
      // skip space
      i++;
      continue;
    } else {
      cur += ch;
    }
    i++;
  }
  if (cur.trim() || parts.length === 0) parts.push(cur.trim());
  return parts;
}

function transformValue(raw: string, strategy: SqlStrategy, salt: string, cache: Map<string, string>): string {
  const isQuoted = (raw.startsWith("'") && raw.endsWith("'")) || (raw.startsWith('"') && raw.endsWith('"'));
  const quote = isQuoted ? raw[0] : "'";
  let inner = isQuoted ? raw.slice(1, -1).replace(/''/g, "'") : raw;
  // NULL / numbers keep as is if keep
  if (!isQuoted && /^(NULL|DEFAULT)$/i.test(inner.trim())) return raw;

  let outInner: string;
  switch (strategy) {
    case 'keep':
      return raw;
    case 'redact':
      outInner = '[REDACTED]';
      break;
    case 'mask':
      outInner = maskValue(inner);
      break;
    case 'hash':
      outInner = hashSync(inner, salt);
      break;
    case 'pseudonymize': {
      const key = `${salt}:${inner}`;
      if (cache.has(key)) outInner = cache.get(key)!;
      else {
        outInner = `anon_${hashSync(inner, salt).slice(0, 6)}`;
        cache.set(key, outInner);
      }
      break;
    }
    default:
      return raw;
  }
  if (isQuoted) {
    const escaped = outInner.replace(/'/g, "''");
    return `${quote}${escaped}${quote}`;
  }
  // if original was not quoted but we produce string, quote it
  return `'${outInner.replace(/'/g, "''")}'`;
}

export function anonymizeSqlDump(sql: string, config: SqlAnonConfig, options: SqlAnonOptions): { output: string; tables: number; rows: number } {
  const parsed = parseInsertColumns(sql);
  if (!parsed) throw new Error('No INSERT INTO ... (columns) VALUES found. Only simple INSERT dumps are supported.');

  const { columns } = parsed;
  const cache = new Map<string, string>();

  // Find VALUES tuples: (...), (...), ...
  // Use regex to capture tuples after VALUES
  const valuesIdx = sql.toUpperCase().indexOf('VALUES');
  if (valuesIdx === -1) throw new Error('No VALUES keyword found.');

  const beforeValues = sql.slice(0, valuesIdx + 6);
  let rest = sql.slice(valuesIdx + 6);

  // Extract tuples via paren depth
  const tuples: string[] = [];
  let depth = 0;
  let cur = '';
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < rest.length; i++) {
    const ch = rest[i];
    if (ch === "'" && !inDouble) {
      if (rest[i + 1] === "'") {
        cur += "''";
        i++;
        continue;
      }
      inSingle = !inSingle;
    } else if (ch === '"' && !inSingle) {
      inDouble = !inDouble;
    }
    if (!inSingle && !inDouble) {
      if (ch === '(') {
        if (depth === 0) cur = '';
        depth++;
        if (depth > 1) cur += ch;
        continue;
      }
      if (ch === ')') {
        depth--;
        if (depth === 0) {
          tuples.push(cur);
          cur = '';
          continue;
        }
        cur += ch;
        continue;
      }
      if (ch === ';' && depth === 0) break;
    }
    if (depth >= 1) cur += ch;
  }

  if (tuples.length === 0) throw new Error('No value tuples found after VALUES.');

  const transformedTuples = tuples.map(tuple => {
    const values = splitValuesTuple(tuple);
    const outValues = values.map((v, idx) => {
      const col = columns[idx] ?? `col${idx}`;
      const strat = config[col] ?? 'keep';
      return transformValue(v, strat, options.salt, cache);
    });
    return `(${outValues.join(', ')})`;
  });

  const output = `${beforeValues}\n${transformedTuples.join(',\n')};`;
  return { output, tables: 1, rows: tuples.length };
}

export function inferSqlStrategies(columns: string[]): SqlAnonConfig {
  const hints = ['email', 'phone', 'name', 'address', 'city', 'cnpj', 'card', 'token', 'secret', 'password', 'ip'];
  const cfg: SqlAnonConfig = {};
  for (const c of columns) {
    const lower = c.toLowerCase();
    cfg[c] = hints.some(h => lower.includes(h)) ? 'pseudonymize' : 'keep';
  }
  return cfg;
}
