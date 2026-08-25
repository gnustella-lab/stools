export type ScriptName =
  | 'Latin'
  | 'Cyrillic'
  | 'Greek'
  | 'Arabic'
  | 'Hebrew'
  | 'Han'
  | 'Hiragana'
  | 'Katakana'
  | 'Hangul'
  | 'Thai'
  | 'Devanagari'
  | 'Common'
  | 'Other';

export type HomographSeverity = 'high' | 'medium' | 'low' | 'info';

export interface HomographFinding {
  severity: HomographSeverity;
  title: string;
  detail: string;
  evidence?: string;
}

export interface HomographHighlight {
  char: string;
  index: number;
  script: ScriptName;
  lookalike?: string;
  hex: string;
}

export type HomographKind = 'url' | 'email' | 'domain' | 'text';

export interface HomographReport {
  input: string;
  kind: HomographKind;
  host: string | null;
  unicodeHost: string | null;
  punycodeHost: string | null;
  scripts: ScriptName[];
  mixedScript: boolean;
  findings: HomographFinding[];
  highlights: HomographHighlight[];
}

interface ScriptRange {
  name: Exclude<ScriptName, 'Common' | 'Other'>;
  from: number;
  to: number;
}

const SCRIPT_RANGES: ScriptRange[] = [
  {name: 'Latin', from: 0x0041, to: 0x005a},
  {name: 'Latin', from: 0x0061, to: 0x007a},
  {name: 'Latin', from: 0x00c0, to: 0x00d6},
  {name: 'Latin', from: 0x00d8, to: 0x00f6},
  {name: 'Latin', from: 0x00f8, to: 0x024f},
  {name: 'Latin', from: 0x1e00, to: 0x1eff},
  {name: 'Latin', from: 0x2c60, to: 0x2c7f},
  {name: 'Latin', from: 0xa720, to: 0xa7ff},
  {name: 'Cyrillic', from: 0x0400, to: 0x04ff},
  {name: 'Cyrillic', from: 0x0500, to: 0x052f},
  {name: 'Cyrillic', from: 0x2de0, to: 0x2dff},
  {name: 'Cyrillic', from: 0xa640, to: 0xa69f},
  {name: 'Greek', from: 0x0370, to: 0x03ff},
  {name: 'Greek', from: 0x1f00, to: 0x1fff},
  {name: 'Arabic', from: 0x0600, to: 0x06ff},
  {name: 'Arabic', from: 0x0750, to: 0x077f},
  {name: 'Arabic', from: 0x08a0, to: 0x08ff},
  {name: 'Arabic', from: 0xfb50, to: 0xfdff},
  {name: 'Arabic', from: 0xfe70, to: 0xfeff},
  {name: 'Hebrew', from: 0x0590, to: 0x05ff},
  {name: 'Han', from: 0x3400, to: 0x4dbf},
  {name: 'Han', from: 0x4e00, to: 0x9fff},
  {name: 'Han', from: 0xf900, to: 0xfaff},
  {name: 'Hiragana', from: 0x3040, to: 0x309f},
  {name: 'Katakana', from: 0x30a0, to: 0x30ff},
  {name: 'Hangul', from: 0x1100, to: 0x11ff},
  {name: 'Hangul', from: 0xac00, to: 0xd7af},
  {name: 'Thai', from: 0x0e00, to: 0x0e7f},
  {name: 'Devanagari', from: 0x0900, to: 0x097f},
];

const CONFUSABLES: Record<string, string> = {
  а: 'a',
  е: 'e',
  о: 'o',
  р: 'p',
  с: 'c',
  у: 'y',
  х: 'x',
  і: 'i',
  ј: 'j',
  ѕ: 's',
  ԁ: 'd',
  ԛ: 'q',
  ԝ: 'w',
  һ: 'h',
  А: 'A',
  В: 'B',
  Е: 'E',
  К: 'K',
  М: 'M',
  Н: 'H',
  О: 'O',
  Р: 'P',
  С: 'C',
  Т: 'T',
  Х: 'X',
  І: 'I',
  Ј: 'J',
  Ѕ: 'S',
  ο: 'o',
  α: 'a',
  ν: 'v',
  ρ: 'p',
  τ: 't',
  υ: 'u',
  χ: 'x',
  κ: 'k',
  η: 'n',
  ι: 'i',
  Ο: 'O',
  Α: 'A',
  Ν: 'N',
  Ρ: 'P',
  Τ: 'T',
  Υ: 'Y',
  Χ: 'X',
  Κ: 'K',
  Η: 'H',
  Ι: 'I',
  ɑ: 'a',
  ɡ: 'g',
  ɩ: 'i',
  ꜱ: 's',
  ᴏ: 'o',
  ⅰ: 'i',
  Ⅰ: 'I',
};

const INVISIBLE = new Set([
  0x00ad, 0x034f, 0x061c, 0x115f, 0x1160, 0x17b4, 0x17b5, 0x180b, 0x180c, 0x180d,
  0x180e, 0x200b, 0x200c, 0x200d, 0x200e, 0x200f, 0x202a, 0x202b, 0x202c, 0x202d,
  0x202e, 0x2060, 0x2061, 0x2062, 0x2063, 0x2064, 0x2066, 0x2067, 0x2068, 0x2069,
  0x206a, 0x206b, 0x206c, 0x206d, 0x206e, 0x206f, 0xfeff, 0xffa0,
]);

const BIDI_OVERRIDES = new Set([0x202a, 0x202b, 0x202c, 0x202d, 0x202e, 0x2066, 0x2067, 0x2068, 0x2069]);

export function scriptOf(codePoint: number): ScriptName {
  if (
    (codePoint >= 0x0030 && codePoint <= 0x0039) ||
    (codePoint >= 0x0020 && codePoint <= 0x002f) ||
    (codePoint >= 0x003a && codePoint <= 0x0040) ||
    (codePoint >= 0x005b && codePoint <= 0x0060) ||
    (codePoint >= 0x007b && codePoint <= 0x007e) ||
    codePoint === 0x00a0
  ) {
    return 'Common';
  }
  for (const range of SCRIPT_RANGES) {
    if (codePoint >= range.from && codePoint <= range.to) {
      return range.name;
    }
  }
  return 'Other';
}

export function detectKind(input: string): HomographKind {
  const trimmed = input.trim();
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('//')) return 'url';
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return 'email';
  if (/^[a-z0-9._-]*xn--[a-z0-9-]+(\.[a-z0-9._-]+)+$/i.test(trimmed)) return 'domain';
  if (/^(?:[a-z0-9-]+\.)+[a-z]{2,}$/i.test(trimmed) && !trimmed.includes(' ')) return 'domain';
  return 'text';
}

function extractUrlHost(input: string): string | null {
  const href = input.startsWith('//') ? `https:${input}` : input;
  const match = href.match(/^https?:\/\/([^/?#]+)/i);
  if (match) {
    let authority = match[1];
    const at = authority.lastIndexOf('@');
    if (at >= 0) authority = authority.slice(at + 1);
    if (authority.startsWith('[')) {
      const end = authority.indexOf(']');
      return (end >= 0 ? authority.slice(0, end + 1) : authority).toLowerCase();
    }
    const colon = authority.lastIndexOf(':');
    if (colon >= 0 && /^\d+$/.test(authority.slice(colon + 1))) {
      authority = authority.slice(0, colon);
    }
    return authority.toLowerCase() || null;
  }
  try {
    return new URL(href).hostname;
  } catch {
    return null;
  }
}

function extractHost(input: string, kind: HomographKind): string | null {
  const trimmed = input.trim();
  if (kind === 'email') {
    const at = trimmed.lastIndexOf('@');
    return at >= 0 ? trimmed.slice(at + 1).toLowerCase() : null;
  }
  if (kind === 'domain') return trimmed.replace(/\.$/, '').toLowerCase();
  if (kind === 'url') return extractUrlHost(trimmed);
  return null;
}

function asciiHost(host: string): string | null {
  try {
    return new URL(`http://${host}`).hostname;
  } catch {
    return null;
  }
}

/** RFC 3492 punycode decode for a single IDNA label (without the xn-- prefix). */
function decodePunycode(encoded: string): string {
  const BASE = 36;
  const TMIN = 1;
  const TMAX = 26;
  const SKEW = 38;
  const DAMP = 700;
  const INITIAL_BIAS = 72;
  const INITIAL_N = 128;

  const output: number[] = [];
  const delim = encoded.lastIndexOf('-');
  if (delim >= 0) {
    for (let i = 0; i < delim; i++) {
      const code = encoded.charCodeAt(i);
      if (code > 0x7f) throw new Error('non-ascii in punycode basic block');
      output.push(code);
    }
  }

  let n = INITIAL_N;
  let bias = INITIAL_BIAS;
  let i = 0;
  let index = delim >= 0 ? delim + 1 : 0;

  const digitValue = (code: number): number => {
    if (code >= 0x30 && code <= 0x39) return code - 22;
    if (code >= 0x41 && code <= 0x5a) return code - 65;
    if (code >= 0x61 && code <= 0x7a) return code - 97;
    throw new Error('invalid punycode digit');
  };

  const adapt = (delta: number, numPoints: number, firstTime: boolean): number => {
    let next = firstTime ? Math.floor(delta / DAMP) : delta >> 1;
    next += Math.floor(next / numPoints);
    let k = 0;
    while (next > ((BASE - TMIN) * TMAX) >> 1) {
      next = Math.floor(next / (BASE - TMIN));
      k += BASE;
    }
    return k + Math.floor(((BASE - TMIN + 1) * next) / (next + SKEW));
  };

  while (index < encoded.length) {
    const oldI = i;
    let w = 1;
    for (let k = BASE; ; k += BASE) {
      if (index >= encoded.length) throw new Error('truncated punycode');
      const digit = digitValue(encoded.charCodeAt(index++));
      i += digit * w;
      const t = k <= bias ? TMIN : k >= bias + TMAX ? TMAX : k - bias;
      if (digit < t) break;
      w *= BASE - t;
    }
    const out = output.length + 1;
    bias = adapt(i - oldI, out, oldI === 0);
    n += Math.floor(i / out);
    i %= out;
    output.splice(i, 0, n);
    i += 1;
  }

  return String.fromCodePoint(...output);
}

function decodeIdnaLabel(label: string): string {
  if (!/^xn--/i.test(label)) return label;
  try {
    return decodePunycode(label.slice(4));
  } catch {
    return label;
  }
}

function unicodeHostOf(host: string): string {
  return host.split('.').map(decodeIdnaLabel).join('.');
}

function hexCode(codePoint: number): string {
  return `U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`;
}

function lookalikeOf(char: string): string | undefined {
  if (CONFUSABLES[char]) return CONFUSABLES[char];
  const code = char.codePointAt(0);
  if (code === undefined) return undefined;
  if (code >= 0xff01 && code <= 0xff5e) {
    return String.fromCodePoint(code - 0xfee0);
  }
  if (code >= 0x1d400 && code <= 0x1d7ff) {
    return 'mathematical-alnum';
  }
  return undefined;
}

export function inspectHomograph(input: string): HomographReport {
  const kind = detectKind(input);
  const host = extractHost(input, kind);
  const unicodeHost = host ? unicodeHostOf(host) : null;
  const punycodeHost = host ? asciiHost(host) : null;

  const scanTarget = unicodeHost ?? host ?? input;
  const highlights: HomographHighlight[] = [];
  const scriptSet = new Set<ScriptName>();
  const lookalikes: string[] = [];
  const invisible: string[] = [];
  const bidi: string[] = [];

  const chars = [...scanTarget];
  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    const code = char.codePointAt(0) ?? 0;
    const script = scriptOf(code);
    if (script !== 'Common') scriptSet.add(script);
    const lookalike = lookalikeOf(char);
    highlights.push({
      char,
      index: i,
      script,
      lookalike,
      hex: hexCode(code),
    });
    if (lookalike && lookalike !== char) {
      lookalikes.push(`${char} (${hexCode(code)}) ≈ ${lookalike}`);
    }
    if (INVISIBLE.has(code)) {
      invisible.push(hexCode(code));
    }
    if (BIDI_OVERRIDES.has(code)) {
      bidi.push(hexCode(code));
    }
  }

  const scripts = [...scriptSet];
  const mixedScript = scripts.filter(s => s !== 'Other').length > 1;
  const findings: HomographFinding[] = [];

  if (invisible.length > 0) {
    findings.push({
      severity: 'high',
      title: 'Invisible characters',
      detail:
        'Zero-width, joiners or other invisible code points can hide a different domain or spoof a username.',
      evidence: invisible.join(', '),
    });
  }

  if (bidi.length > 0) {
    findings.push({
      severity: 'high',
      title: 'Bidirectional override',
      detail:
        'Unicode bidi overrides can reverse how a URL or filename is displayed, a classic spoofing trick.',
      evidence: bidi.join(', '),
    });
  }

  if (mixedScript) {
    findings.push({
      severity: 'high',
      title: 'Mixed writing systems',
      detail: `This value mixes ${scripts.join(' + ')}. Phishing domains often swap a Latin letter for a lookalike from another script.`,
      evidence: scripts.join(', '),
    });
  }

  if (lookalikes.length > 0) {
    findings.push({
      severity: mixedScript ? 'high' : 'medium',
      title: 'Lookalike characters',
      detail: 'Characters that visually mimic ASCII were found. Compare the decoded form before trusting this value.',
      evidence: lookalikes.slice(0, 12).join(', '),
    });
  }

  if (host?.includes('xn--') || (unicodeHost && /[^\u0000-\u007f]/.test(unicodeHost))) {
    findings.push({
      severity: 'medium',
      title: 'Internationalized domain (punycode)',
      detail:
        'IDN hostnames are encoded as xn--… in DNS. Confirm the Unicode form matches the site you expect.',
      evidence: unicodeHost && punycodeHost && unicodeHost !== punycodeHost
        ? `${unicodeHost} → ${punycodeHost}`
        : (unicodeHost ?? host ?? undefined),
    });
  }

  const nfd = scanTarget.normalize('NFD');
  if (nfd !== scanTarget && /\p{M}/u.test(nfd)) {
    findings.push({
      severity: 'low',
      title: 'Combining marks',
      detail: 'Accent or combining marks can make two strings look identical while remaining different bytes.',
    });
  }

  if (kind === 'url' && host) {
    const labels = host.split('.');
    if (labels.some(label => label.length > 63)) {
      findings.push({
        severity: 'medium',
        title: 'Oversized DNS label',
        detail: 'A hostname label exceeds 63 characters, which is unusual for a legitimate domain.',
      });
    }
  }

  if (findings.length === 0) {
    findings.push({
      severity: 'info',
      title: 'No spoofing signals',
      detail:
        scripts.length <= 1
          ? 'No mixed scripts, invisible characters or common lookalikes were detected.'
          : 'Nothing obvious stood out, but always compare the address bar before signing in.',
    });
  }

  return {
    input,
    kind,
    host,
    unicodeHost,
    punycodeHost: punycodeHost && punycodeHost !== unicodeHost ? punycodeHost : host?.includes('xn--') ? host : null,
    scripts,
    mixedScript,
    findings,
    highlights,
  };
}
