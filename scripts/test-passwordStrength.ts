import {analyzePassword} from '../src/lib/passwordStrength.ts';

let failures = 0;
function check(name: string, ok: boolean, detail = '') {
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
}

const empty = analyzePassword('');
check('empty returns null', empty === null);

const weak = analyzePassword('password123');
check('password123 analyzed', weak !== null);
check('password123 is Very weak', weak?.label === 'Very weak', weak?.label);
check('password123 score is 0', weak?.score === 0, String(weak?.score));
check(
  'password123 flags common list',
  weak?.findings.some(f => /common-password/i.test(f.title)) ?? false,
  weak?.findings.map(f => f.title).join('; '),
);

const strong = analyzePassword('xK9#mP2$vL8!qR4&wN7@zT6^');
check('long random analyzed', strong !== null);
check(
  'long random is Strong or Excellent',
  strong !== null && strong.score >= 3,
  `${strong?.label} (${strong?.score})`,
);
check(
  'long random uses mixed classes',
  Boolean(strong?.classes.lower && strong?.classes.upper && strong?.classes.digit && strong?.classes.symbol),
);

if (failures > 0) {
  console.error(`${failures} case(s) failed`);
  process.exit(1);
}
console.log('TODOS OS CASOS PASSARAM');
