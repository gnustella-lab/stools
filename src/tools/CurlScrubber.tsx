import { useMemo, useState } from 'react';
import { VStack, HStack } from '@astryxdesign/core/Layout';
import { TextArea } from '@astryxdesign/core/TextArea';
import { Text } from '@astryxdesign/core/Text';
import { Switch } from '@astryxdesign/core/Switch';
import { Banner } from '@astryxdesign/core/Banner';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { Token } from '@astryxdesign/core/Token';
import { CopyButton } from '../components/CopyButton';
import { scrubCurl, DEFAULT_CURL_OPTIONS } from '../lib/curlScrub';

export default function CurlScrubber() {
  const [input, setInput] = useState('curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0In0.signature" -H "X-Api-Key: sk-1234567890abcdef" -b "session=abc123" "https://api.example.com/users?token=secret123&filter=all"');
  const [opts, setOpts] = useState(DEFAULT_CURL_OPTIONS);

  const result = useMemo(() => scrubCurl(input, opts), [input, opts]);

  const toggle = (k: keyof typeof opts) => setOpts(prev => ({ ...prev, [k]: !prev[k] }));

  return (
    <VStack gap={4}>
      <Text type="supporting" display="block">
        Paste a cURL, HTTPie, or fetch snippet — Auth headers, cookies, query tokens, JWTs and IPs are redacted locally before you share it in a ticket.
      </Text>

      <TextArea label="Command / snippet" placeholder='curl -H "Authorization: Bearer ..." https://...' value={input} onChange={setInput} rows={6} hasSpellCheck={false} />

      <VStack gap={2}>
        <Text weight="semibold" display="block">Options</Text>
        <HStack gap={3} wrap="wrap">
          <Switch label="Cookies (-b / Cookie:)" value={opts.cookies} onChange={() => toggle('cookies')} />
          <Switch label="Auth headers" value={opts.authHeaders} onChange={() => toggle('authHeaders')} />
          <Switch label="Query secrets" value={opts.querySecrets} onChange={() => toggle('querySecrets')} />
          <Switch label="JWT / Bearer" value={opts.tokens} onChange={() => toggle('tokens')} />
          <Switch label="IPs" value={opts.ips} onChange={() => toggle('ips')} />
        </HStack>
      </VStack>

      {input.trim() && (
        <HStack gap={2} wrap="wrap" vAlign="center">
          <Text type="supporting" display="block">
            {result.total === 0 ? 'No secrets detected with current options.' : `${result.total} redaction(s)`}
          </Text>
          {Object.entries(result.counts).map(([k, v]) => (
            <Token key={k} label={`${k}: ${v}`} size="sm" color="orange" />
          ))}
          <CopyButton value={result.output} />
        </HStack>
      )}

      {input.trim() && (
        <CodeBlock code={result.output} language="bash" width="100%" maxHeight={360} isWrapped hasCopyButton={false} />
      )}

      <Banner status="info" title="Local only" description="Parsing uses regex in this tab. For HAR files use HAR Sanitizer; for raw headers use Privacy Header Inspector." />
      <Text type="supporting" display="block">Honest limits: pattern-based — exotic header names or secrets inside opaque bodies can slip through. Skim the output before sharing.</Text>
    </VStack>
  );
}
