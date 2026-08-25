export type PasswordScore = 0 | 1 | 2 | 3 | 4;

export interface PasswordFinding {
  severity: 'high' | 'medium' | 'low';
  title: string;
  detail: string;
}

export interface PasswordClasses {
  lower: boolean;
  upper: boolean;
  digit: boolean;
  symbol: boolean;
  unicode: boolean;
}

export interface PasswordAnalysis {
  length: number;
  charsetSize: number;
  entropyBits: number;
  shannonBits: number;
  score: PasswordScore;
  label: 'Very weak' | 'Weak' | 'Fair' | 'Strong' | 'Excellent';
  classes: PasswordClasses;
  findings: PasswordFinding[];
}

const COMMON = new Set(
  [
    'password', 'password1', 'password123', 'passw0rd', '123456', '1234567', '12345678',
    '123456789', '1234567890', '111111', '000000', '123123', '654321', 'qwerty',
    'qwerty123', 'qwertyuiop', 'asdfgh', 'asdfghjkl', 'zxcvbn', 'zxcvbnm', 'admin',
    'admin123', 'root', 'toor', 'letmein', 'welcome', 'welcome1', 'login', 'master',
    'dragon', 'monkey', 'shadow', 'sunshine', 'princess', 'football', 'baseball',
    'soccer', 'iloveyou', 'trustno1', 'abc123', 'abc123456', '1q2w3e4r', '1qaz2wsx',
    'qazwsx', 'pass', 'pass123', 'changeme', 'secret', 'secret123', 'default',
    'guest', 'user', 'test', 'test123', 'p@ssw0rd', 'p@ssword', 'passwort',
    'senha', 'senha123', 'administrador', 'acesso', 'acesso123', 'brasil',
    'brazil', 'qwerty1', 'mustang', 'michael', 'jennifer', 'hunter', 'buster',
    'soccer123', 'starwars', 'whatever', 'freedom', 'cookie', 'hello', 'hello123',
    'welcome123', 'superman', 'batman', 'pokemon', 'ninja', 'pepper', 'summer',
    'winter', 'spring', 'autumn', 'love', 'lovely', 'loveme', 'jesus', 'michael1',
    'charlie', 'andrea', 'daniel', 'thomas', 'andrew', 'joshua', 'harley',
    'robert', 'matthew', 'jordan', 'nicole', 'jessica', 'pepper1', 'computer',
    'internet', 'qwerty12',
  ].map(item => item.toLowerCase()),
);

const COMMON_WORDS = [
  'password', 'admin', 'welcome', 'login', 'letmein', 'dragon', 'master',
  'monkey', 'shadow', 'sunshine', 'princess', 'football', 'baseball', 'soccer',
  'secret', 'qwerty', 'iloveyou', 'trustno1', 'changeme', 'default', 'guest',
  'senha', 'acesso', 'brasil', 'love', 'pass', 'user', 'root', 'test',
  'summer', 'winter', 'spring', 'autumn', 'hello', 'computer', 'internet',
];

const KEYBOARD_WALKS = [
  'qwertyuiop', 'qwertyuiop[]', 'asdfghjkl', 'asdfghjkl;', 'zxcvbnm',
  '1qaz2wsx', 'qazwsx', 'zaq12wsx', '!qaz@wsx', '1234567890',
  'qwer', 'asdf', 'zxcv', '1q2w3e', '1q2w3e4r', 'q1w2e3',
];

const LEET: Record<string, string> = {
  '@': 'a',
  '4': 'a',
  '8': 'b',
  '(': 'c',
  '3': 'e',
  '9': 'g',
  '1': 'i',
  '!': 'i',
  '0': 'o',
  '5': 's',
  '$': 's',
  '7': 't',
  '+': 't',
};

function deleet(value: string): string {
  return [...value.toLowerCase()].map(ch => LEET[ch] ?? ch).join('');
}

function shannon(value: string): number {
  if (!value) return 0;
  const freq = new Map<string, number>();
  for (const ch of value) freq.set(ch, (freq.get(ch) ?? 0) + 1);
  let bits = 0;
  for (const count of freq.values()) {
    const p = count / value.length;
    bits -= p * Math.log2(p);
  }
  return bits * value.length;
}

function charsetSize(classes: PasswordClasses): number {
  let size = 0;
  if (classes.lower) size += 26;
  if (classes.upper) size += 26;
  if (classes.digit) size += 10;
  if (classes.symbol) size += 32;
  if (classes.unicode) size += 50;
  return size || 1;
}

function hasSequence(value: string): boolean {
  const lower = value.toLowerCase();
  const alpha = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  for (let i = 0; i < lower.length - 2; i++) {
    const slice = lower.slice(i, i + 3);
    if (alpha.includes(slice) || alpha.includes([...slice].reverse().join(''))) return true;
    if (digits.includes(slice) || digits.includes([...slice].reverse().join(''))) return true;
  }
  return false;
}

function hasKeyboardWalk(value: string): boolean {
  const lower = value.toLowerCase();
  return KEYBOARD_WALKS.some(walk => lower.includes(walk) || walk.includes(lower) && lower.length >= 4);
}

function yearLike(value: string): string | null {
  const match = value.match(/(?:19|20)\d{2}/);
  return match ? match[0] : null;
}

function repeatRun(value: string): number {
  let best = 1;
  let run = 1;
  for (let i = 1; i < value.length; i++) {
    if (value[i] === value[i - 1]) {
      run += 1;
      if (run > best) best = run;
    } else {
      run = 1;
    }
  }
  return best;
}

export function analyzePassword(password: string): PasswordAnalysis | null {
  if (!password) return null;

  const classes: PasswordClasses = {
    lower: /[a-z]/.test(password),
    upper: /[A-Z]/.test(password),
    digit: /\d/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
    unicode: /[^\u0000-\u007f]/.test(password),
  };

  const size = charsetSize(classes);
  const entropyBits = password.length * Math.log2(size);
  const shannonBits = shannon(password);
  const findings: PasswordFinding[] = [];
  let penalty = 0;

  const lower = password.toLowerCase();
  if (COMMON.has(lower)) {
    findings.push({
      severity: 'high',
      title: 'Appears in common-password lists',
      detail: 'This exact value is among the passwords attackers try first. Do not use it anywhere.',
    });
    penalty += 4;
  }

  const normalized = deleet(password).replace(/[^a-z]/g, '');
  const wordHit = COMMON_WORDS.find(word => normalized.includes(word) && word.length >= 4);
  if (wordHit && !COMMON.has(lower)) {
    findings.push({
      severity: 'high',
      title: `Contains a common word (“${wordHit}”)`,
      detail: 'Dictionary words, even with 1337 substitutions, are cracked quickly.',
    });
    penalty += 2;
  }

  if (hasKeyboardWalk(password)) {
    findings.push({
      severity: 'high',
      title: 'Keyboard walk',
      detail: 'Sequences such as qwerty or 1qaz2wsx are in every cracking wordlist.',
    });
    penalty += 2;
  }

  if (hasSequence(password)) {
    findings.push({
      severity: 'medium',
      title: 'Sequential characters',
      detail: 'Runs like abc or 123 reduce the search space dramatically.',
    });
    penalty += 1;
  }

  const year = yearLike(password);
  if (year) {
    findings.push({
      severity: 'medium',
      title: `Contains a year (${year})`,
      detail: 'Birth years and current years are among the first suffixes attackers append.',
    });
    penalty += 1;
  }

  const run = repeatRun(password);
  if (run >= 3) {
    findings.push({
      severity: 'medium',
      title: 'Repeated characters',
      detail: `A run of ${run} identical characters adds almost no entropy.`,
    });
    penalty += 1;
  }

  if (password.length < 8) {
    findings.push({
      severity: 'high',
      title: 'Shorter than 8 characters',
      detail: 'Short secrets fall to offline guessing even when the alphabet is large.',
    });
    penalty += 2;
  } else if (password.length < 12) {
    findings.push({
      severity: 'low',
      title: 'Under 12 characters',
      detail: '12+ characters (or a 5-word passphrase) is a safer default for new secrets.',
    });
    penalty += 1;
  }

  const classCount = [classes.lower, classes.upper, classes.digit, classes.symbol].filter(Boolean).length;
  if (classCount <= 1) {
    findings.push({
      severity: 'medium',
      title: 'Single character class',
      detail: 'Using only letters or only digits makes brute force far cheaper.',
    });
    penalty += 1;
  }

  if (classes.unicode) {
    findings.push({
      severity: 'low',
      title: 'Contains non-ASCII characters',
      detail: 'Unicode can add entropy, but some sites normalize or reject it. Confirm the service accepts it.',
    });
  }

  let score = 0 as PasswordScore;
  if (entropyBits >= 80 && penalty <= 1) score = 4;
  else if (entropyBits >= 60 && penalty <= 2) score = 3;
  else if (entropyBits >= 40 && penalty <= 3) score = 2;
  else if (entropyBits >= 28 && penalty <= 4) score = 1;
  else score = 0;

  score = Math.max(0, Math.min(4, score - Math.max(0, penalty - 1))) as PasswordScore;
  if (COMMON.has(lower) || password.length < 6) score = 0;

  const labels = ['Very weak', 'Weak', 'Fair', 'Strong', 'Excellent'] as const;

  if (findings.length === 0) {
    findings.push({
      severity: 'low',
      title: 'No obvious weak patterns',
      detail: 'Length and character mix look reasonable. A password manager still beats memorizing one reusable secret.',
    });
  }

  return {
    length: password.length,
    charsetSize: size,
    entropyBits,
    shannonBits,
    score,
    label: labels[score],
    classes,
    findings,
  };
}
