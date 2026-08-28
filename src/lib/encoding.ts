export function toHtmlEntities(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function fromHtmlEntities(text: string): string {
  const doc = new DOMParser().parseFromString(text, 'text/html');
  return doc.documentElement.textContent ?? text;
}

export function toUnicodeEscapes(text: string): string {
  let out = '';
  for (const ch of text) {
    const cp = ch.codePointAt(0) ?? 0;
    if (cp > 0xffff) out += `\\u{${cp.toString(16)}}`;
    else out += `\\u${cp.toString(16).padStart(4, '0')}`;
  }
  return out;
}

export function fromUnicodeEscapes(text: string): string {
  // \uXXXX and \u{XXXXX}
  return text
    .replace(/\\u\{([0-9a-fA-F]+)\}/g, (_m, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/\\u([0-9a-fA-F]{4})/g, (_m, hex) => String.fromCharCode(parseInt(hex, 16)));
}

export function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  bytes.forEach(b => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

export function fromBase64(text: string): string {
  const normalized = text.trim().replaceAll('-', '+').replaceAll('_', '/').replace(/\s+/g, '');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  return new TextDecoder().decode(Uint8Array.from(binary, c => c.charCodeAt(0)));
}

export function detectMojibake(text: string): string[] {
  const warnings: string[] = [];
  if (text.includes('�')) warnings.push('Contains replacement character � — likely wrong charset.');
  if (/Ã|Â/.test(text) && /[©®]/.test(text) === false) {
    // heuristic UTF-8 decoded as latin1
    if (text.includes('Ã©') || text.includes('Ã¡') || text.includes('Â')) warnings.push('Possibly UTF-8 bytes mis-decoded as Latin-1 (e.g., Ã©).');
  }
  return warnings;
}

export function toQuotedPrintable(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let out = '';
  for (const b of bytes) {
    if ((b >= 33 && b <= 60) || (b >= 62 && b <= 126)) out += String.fromCharCode(b);
    else if (b === 9 || b === 32) out += String.fromCharCode(b);
    else out += `=${b.toString(16).toUpperCase().padStart(2, '0')}`;
  }
  return out;
}

export function fromQuotedPrintable(text: string): string {
  const hexReplaced = text.replace(/=([0-9A-Fa-f]{2})/g, (_m, hex) => String.fromCharCode(parseInt(hex, 16)));
  // remove soft line breaks =\\r?\\n
  const withoutSoft = hexReplaced.replace(/=\r?\n/g, '');
  return withoutSoft;
}
