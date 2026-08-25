import {inspectHomograph} from '../src/lib/homograph.ts';

let failures = 0;

function check(name: string, ok: boolean, detail = '') {
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
}

const mixed = inspectHomograph('https://ex\u0430mple.com/login');
check('kind is url', mixed.kind === 'url', mixed.kind);
check('host extracted', mixed.host !== null, String(mixed.host));
check('mixed scripts', mixed.mixedScript, mixed.scripts.join('+'));
check(
  'Cyrillic detected',
  mixed.scripts.includes('Cyrillic'),
  mixed.scripts.join(', '),
);
check(
  'lookalike finding',
  mixed.findings.some(f => /lookalike/i.test(f.title)),
  mixed.findings.map(f => f.title).join('; '),
);

const clean = inspectHomograph('https://example.com/login');
check('clean latin is not mixed', !clean.mixedScript, clean.scripts.join('+'));
check(
  'clean latin has no high-severity spoof',
  !clean.findings.some(f => f.severity === 'high'),
  clean.findings.map(f => `${f.severity}:${f.title}`).join('; '),
);

const puny = inspectHomograph('https://xn--e1awd7f.com');
check(
  'punycode flagged',
  puny.findings.some(f => /punycode|internationalized/i.test(f.title)),
  puny.findings.map(f => f.title).join('; '),
);

if (failures > 0) {
  console.error(`${failures} case(s) failed`);
  process.exit(1);
}
console.log('TODOS OS CASOS PASSARAM');
