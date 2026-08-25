import {sanitizeCapture} from '../src/lib/harSanitize.ts';

const har = {
  log: {
    entries: [
      {
        serverIPAddress: '203.0.113.10',
        request: {
          url: 'https://api.example.com/v1?access_token=supersecret&id=42',
          headers: [
            {name: 'Authorization', value: 'Bearer abcdefghijklmnop'},
            {name: 'Accept', value: 'application/json'},
          ],
          queryString: [
            {name: 'access_token', value: 'supersecret'},
            {name: 'id', value: '42'},
          ],
        },
      },
    ],
  },
};

const result = sanitizeCapture(JSON.stringify(har));
const parsed: unknown = JSON.parse(result.output);
const entry = (parsed as {log: {entries: Array<{
  serverIPAddress: string;
  request: {
    url: string;
    headers: Array<{name: string; value: string}>;
    queryString: Array<{name: string; value: string}>;
  };
}>}}).log.entries[0];

let failures = 0;
function check(name: string, ok: boolean, detail = '') {
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
}

check('format is har', result.format === 'har', result.format);
check('redacted something', result.total > 0, String(result.total));
check(
  'Authorization redacted',
  entry.request.headers.find(h => h.name === 'Authorization')?.value === '[REDACTED]',
  entry.request.headers.find(h => h.name === 'Authorization')?.value,
);
check(
  'Accept left intact',
  entry.request.headers.find(h => h.name === 'Accept')?.value === 'application/json',
);
check(
  'access_token query redacted',
  entry.request.queryString.find(q => q.name === 'access_token')?.value === '[REDACTED]',
);
check(
  'id query kept',
  entry.request.queryString.find(q => q.name === 'id')?.value === '42',
);
check('IPv4 redacted', entry.serverIPAddress === '[REDACTED]', entry.serverIPAddress);
check('access_token gone from URL', !entry.request.url.includes('supersecret'), entry.request.url);
check('id remains in URL', entry.request.url.includes('id=42'), entry.request.url);

if (failures > 0) {
  console.error(`${failures} case(s) failed`);
  process.exit(1);
}
console.log('TODOS OS CASOS PASSARAM');
