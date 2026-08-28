// Unicode inspector

export interface CodepointInfo {
  char: string;
  codepoint: string; // U+XXXX
  dec: number;
  hex: string;
  utf8: string; // hex bytes
  name?: string;
  category?: string;
}

export function inspectText(text: string): CodepointInfo[] {
  const out: CodepointInfo[] = [];
  for (const ch of text) {
    const cp = ch.codePointAt(0) ?? 0;
    const hex = cp.toString(16).toUpperCase().padStart(4,'0');
    const utf8bytes = [...new TextEncoder().encode(ch)].map(b=>b.toString(16).padStart(2,'0')).join(' ');
    out.push({
      char: ch,
      codepoint: `U+${hex}`,
      dec: cp,
      hex: cp.toString(16),
      utf8: utf8bytes,
    });
  }
  return out;
}

export function normalizeInfo(text: string): Record<string,string> {
  return {
    NFC: text.normalize('NFC'),
    NFD: text.normalize('NFD'),
    NFKC: text.normalize('NFKC'),
    NFKD: text.normalize('NFKD'),
  };
}

export function utf8Bytes(text: string): {hex:string, len:number} {
  const bytes = new TextEncoder().encode(text);
  return {hex: [...bytes].map(b=>b.toString(16).padStart(2,'0')).join(' '), len: bytes.length};
}

export function detectMojibake(text: string): string | null {
  // Heuristic: if text contains replacement char or isolated high bytes decoded as latin1
  // Very naive: check for common mojibake pattern Ã
  if (/Ã|Â/.test(text) && /[^\x00-\x7F]/.test(text)) return 'Possível mojibake (UTF-8 interpretado como Latin-1). Tente decodificar como UTF-8.';
  if (text.includes('�')) return 'Contém � (caractere de substituição) — possível erro de encoding.';
  return null;
}
