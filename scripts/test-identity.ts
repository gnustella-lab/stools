import {
  cnpjCheckDigits,
  cpfCheckDigits,
  generateCnpj,
  generateCpf,
  generateIdentities,
  generateIdentity,
  identitiesToCsv,
} from '../src/lib/identity.ts';

let failures = 0;
function check(name: string, ok: boolean, detail = '') {
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
}

const knownCpf = cpfCheckDigits([1, 1, 1, 4, 4, 4, 7, 7, 7]);
check('known CPF check digits', knownCpf[0] === 3 && knownCpf[1] === 5, knownCpf.join(','));

const knownCnpj = cnpjCheckDigits([1, 1, 2, 2, 2, 3, 3, 3, 0, 0, 0, 1]);
check('known CNPJ check digits', knownCnpj[0] === 8 && knownCnpj[1] === 1, knownCnpj.join(','));

for (let i = 0; i < 8; i++) {
  const formatted = generateCpf(true);
  const digits = [...formatted.replace(/\D/g, '')].map(Number);
  const [d1, d2] = cpfCheckDigits(digits.slice(0, 9));
  check(`generated CPF ${i + 1} check digits`, digits[9] === d1 && digits[10] === d2, formatted);
}

for (let i = 0; i < 4; i++) {
  const formatted = generateCnpj(true);
  const digits = [...formatted.replace(/\D/g, '')].map(Number);
  const [d1, d2] = cnpjCheckDigits(digits.slice(0, 12));
  check(`generated CNPJ ${i + 1} check digits`, digits[12] === d1 && digits[13] === d2, formatted);
}

const br = generateIdentity('br');
check('BR document is CPF', br.documentType === 'CPF', br.documentType);
check('BR email is example.test', br.email.endsWith('@example.test'), br.email);

const us = generateIdentity('us');
check('US document is SSN', us.documentType === 'SSN', us.documentType);

const intl = generateIdentity('intl');
check('intl document is ID', intl.documentType === 'ID', intl.documentType);
check('intl document prefix', intl.document.startsWith('ID-'), intl.document);

const rows = generateIdentities(3, 'br');
check('batch size', rows.length === 3, String(rows.length));
const csv = identitiesToCsv(rows);
check('CSV has header + rows', csv.trim().split('\n').length === 4);

if (failures > 0) {
  console.error(`${failures} case(s) failed`);
  process.exit(1);
}
console.log('TODOS OS CASOS PASSARAM');
