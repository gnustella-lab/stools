export interface JsonlParseResult {
  lines: unknown[];
  errors: { line: number; message: string }[];
  total: number;
  valid: number;
}

export function parseJsonl(text: string): JsonlParseResult {
  const rawLines = text.split(/\r?\n/);
  const lines: unknown[] = [];
  const errors: { line: number; message: string }[] = [];
  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trim();
    if (!line) continue;
    try {
      lines.push(JSON.parse(line));
    } catch (e) {
      errors.push({ line: i + 1, message: e instanceof Error ? e.message : String(e) });
    }
  }
  return { lines, errors, total: rawLines.filter(l => l.trim()).length, valid: lines.length };
}

export function filterJsonl(lines: unknown[], query: string): unknown[] {
  const trimmed = query.trim();
  if (!trimmed) return lines;
  // simple query: key=value or key~=substring or plain substring
  // support AND via spaces? For simplicity, support "key=value" exact or "substring"
  if (trimmed.includes('=')) {
    const eq = trimmed.indexOf('=');
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    const isLike = trimmed.includes('~=');
    const realKey = isLike ? key.replace('~', '').trim() : key;
    return lines.filter(item => {
      if (typeof item !== 'object' || item === null) return false;
      const rec = item as Record<string, unknown>;
      const v = rec[realKey];
      if (v == null) return false;
      const s = String(v);
      return isLike ? s.includes(value) : s === value;
    });
  }
  const lower = trimmed.toLowerCase();
  return lines.filter(item => JSON.stringify(item).toLowerCase().includes(lower));
}

export function toJsonArray(lines: unknown[]): string {
  return JSON.stringify(lines, null, 2);
}

export function toJsonl(lines: unknown[]): string {
  return lines.map(l => JSON.stringify(l)).join('\n');
}

export function sampleLines(lines: unknown[], n: number): unknown[] {
  return lines.slice(0, n);
}
