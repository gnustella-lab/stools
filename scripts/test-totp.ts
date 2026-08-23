// RFC 6238 Appendix B test vectors, secret = ASCII "12345678901234567890".
// Run with: npx tsx scripts/test-totp.ts   (or vite-node)
import {computeTotp} from '../src/lib/totp';

const SECRET_B32 = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'; // base32 of the ASCII secret

const CASES: {time: number; algo: 'SHA1' | 'SHA256' | 'SHA512'; expected: string}[] = [
  {time: 59, algo: 'SHA1', expected: '94287082'},
  {time: 1111111109, algo: 'SHA1', expected: '07081804'},
  {time: 1111111111, algo: 'SHA1', expected: '14050471'},
  {time: 1234567890, algo: 'SHA1', expected: '89005924'},
  {time: 2000000000, algo: 'SHA1', expected: '69279037'},
  {time: 20000000000, algo: 'SHA1', expected: '65353130'},
];

let failures = 0;
for (const c of CASES) {
  const result = await computeTotp(
    {secret: SECRET_B32, digits: 8, period: 30, algorithm: c.algo},
    c.time * 1000,
  );
  const ok = result.code === c.expected;
  if (!ok) failures++;
  console.log(
    `${ok ? 'PASS' : 'FAIL'} t=${c.time} got=${result.code} want=${c.expected}`,
  );
}
process.exit(failures === 0 ? 0 : 1);
