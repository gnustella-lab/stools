import {inspectCookies, inspectResponseHeaders} from '../src/lib/httpPrivacy.ts';

let failures = 0;
function check(name: string, ok: boolean, detail = '') {
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
}

const cookies = inspectCookies([
  'Set-Cookie: session=secret; Path=/; Secure; HttpOnly; SameSite=Lax',
  'Set-Cookie: _ga=tracking-id; Max-Age=63072000; Domain=example.com; Path=/',
].join('\n'));

check('parses Set-Cookie headers', cookies.stats.setCookies === 2, String(cookies.stats.setCookies));
check('does not preserve cookie values in the result', !JSON.stringify(cookies).includes('secret') && !JSON.stringify(cookies).includes('tracking-id'));
check('flags analytics-like cookies', cookies.stats.likelyTracking === 1, String(cookies.stats.likelyTracking));
check('flags missing Secure', cookies.cookies[1].findings.some(item => item.title === 'Secure is missing'));
check('parses request Cookie headers', inspectCookies('Cookie: theme=dark; session=secret').stats.requestCookies === 2);

const headers = inspectResponseHeaders([
  'HTTP/2 200',
  'Referrer-Policy: unsafe-url',
  'Permissions-Policy: camera=(), microphone=(), geolocation=()',
  "Content-Security-Policy: default-src 'self'; img-src *",
  'Cache-Control: public, max-age=3600',
  'Set-Cookie: session=secret; HttpOnly',
].join('\n'));

check('counts response headers', headers.stats.headers === 5, String(headers.stats.headers));
check('does not return Set-Cookie values', !JSON.stringify(headers.headers).includes('secret'));
check('flags unsafe referrer policy', headers.findings.some(item => item.title === 'Referrer policy exposes full URLs'));
check('recognizes blocked permissions', headers.findings.some(item => item.title === 'Sensitive browser capabilities are disabled'));
check('flags public caching', headers.findings.some(item => item.title === 'Response can be shared by caches'));

if (failures > 0) {
  console.error(`${failures} case(s) failed`);
  process.exit(1);
}
console.log('ALL CASES PASSED');
