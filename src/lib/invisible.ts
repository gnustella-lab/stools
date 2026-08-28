export interface InvisibleFinding {
  char: string;
  name: string;
  codepoint: string;
  index: number;
  context: string;
}

const INVISIBLE_MAP: Record<string, string> = {
  '\u200B': 'Zero-Width Space (ZWSP)',
  '\u200C': 'Zero-Width Non-Joiner (ZWNJ)',
  '\u200D': 'Zero-Width Joiner (ZWJ)',
  '\uFEFF': 'Zero-Width No-Break Space / BOM',
  '\u2060': 'Word Joiner',
  '\u2061': 'Function Application',
  '\u2062': 'Invisible Times',
  '\u2063': 'Invisible Separator',
  '\u180E': 'Mongolian Vowel Separator',
  '\u00AD': 'Soft Hyphen',
  '\u034F': 'Combining Grapheme Joiner',
  '\u061C': 'Arabic Letter Mark',
};

const BIDI_MAP: Record<string, string> = {
  '\u202A': 'Left-to-Right Embedding (LRE)',
  '\u202B': 'Right-to-Left Embedding (RLE)',
  '\u202C': 'Pop Directional Formatting (PDF)',
  '\u202D': 'Left-to-Right Override (LRO)',
  '\u202E': 'Right-to-Left Override (RLO)',
  '\u2066': 'Left-to-Right Isolate (LRI)',
  '\u2067': 'Right-to-Left Isolate (RLI)',
  '\u2068': 'First Strong Isolate (FSI)',
  '\u2069': 'Pop Directional Isolate (PDI)',
};

const ALL_INVISIBLE = new Set([...Object.keys(INVISIBLE_MAP), ...Object.keys(BIDI_MAP)]);

export function scanInvisible(text: string): InvisibleFinding[] {
  const findings: InvisibleFinding[] = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ALL_INVISIBLE.has(ch)) {
      const name = INVISIBLE_MAP[ch] ?? BIDI_MAP[ch] ?? 'Invisible';
      const codepoint = `U+${ch.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}`;
      const start = Math.max(0, i - 15);
      const end = Math.min(text.length, i + 15);
      const context = JSON.stringify(text.slice(start, end));
      findings.push({ char: ch, name, codepoint, index: i, context });
    }
  }
  // also flag homoglyph-ish zero width via variation selectors
  for (let i = 0; i < text.length; i++) {
    const cp = text.charCodeAt(i);
    if (cp >= 0xfe00 && cp <= 0xfe0f) {
      findings.push({ char: text[i], name: 'Variation Selector', codepoint: `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`, index: i, context: JSON.stringify(text.slice(Math.max(0, i - 10), i + 10)) });
    }
    if (cp >= 0xe0100 && cp <= 0xe01ef) {
      findings.push({ char: text[i], name: 'Variation Selector Supplement', codepoint: `U+${cp.toString(16).toUpperCase()}`, index: i, context: '...' });
    }
  }
  return findings;
}

export function stripInvisible(text: string): { cleaned: string; removed: number } {
  let removed = 0;
  let out = '';
  for (const ch of text) {
    if (ALL_INVISIBLE.has(ch)) removed++;
    else out += ch;
  }
  // also strip variation selectors FE00-FE0F
  const before = out.length;
  out = out.replace(/[\uFE00-\uFE0F]/g, '');
  removed += before - out.length;
  return { cleaned: out, removed };
}

export function visualizeInvisible(text: string): string {
  let out = '';
  for (const ch of text) {
    if (INVISIBLE_MAP[ch]) out += `⟦${INVISIBLE_MAP[ch].split(' ')[0]}⟧`;
    else if (BIDI_MAP[ch]) out += `⟦${BIDI_MAP[ch].split(' ')[0]}⟧`;
    else if (ch.charCodeAt(0) >= 0xfe00 && ch.charCodeAt(0) <= 0xfe0f) out += '⟦VS⟧';
    else out += ch;
  }
  return out;
}
