import { useMemo, useState } from 'react';
import { VStack, HStack } from '@astryxdesign/core/Layout';
import { TextArea } from '@astryxdesign/core/TextArea';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Text } from '@astryxdesign/core/Text';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import { Banner } from '@astryxdesign/core/Banner';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { Token } from '@astryxdesign/core/Token';
import { CopyButton } from '../components/CopyButton';
import { anonymizeLog, DEFAULT_LOG_OPTIONS } from '../lib/logAnon';

export default function LogAnonymizer() {
  const [input, setInput] = useState('203.0.113.5 - frank [10/Oct/2000:13:55:36 -0700] "GET /api/users?token=secret123 HTTP/1.0" 200 2326 "https://example.com/app" "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"\n198.51.100.23 - alice [10/Oct/2000:13:56:01 -0700] "POST /login HTTP/1.0" 200 12 "-" "curl/7.68.0" email=alice@example.com');
  const [salt, setSalt] = useState('log-salt');
  const [opts, setOpts] = useState(DEFAULT_LOG_OPTIONS);

  const result = useMemo(() => anonymizeLog(input, { ...opts, salt }), [input, opts, salt]);

  return (
    <VStack gap={4}>
      <Text type="supporting" display="block">
        Anonymize Apache/Nginx/CloudFront log lines locally: IPs, user-agents, query tokens, emails and JWTs. Same salt → same pseudonyms for join consistency, if hashing is chosen.
      </Text>

      <TextArea label="Log lines" placeholder="Paste access.log lines…" value={input} onChange={setInput} rows={7} hasSpellCheck={false} />

      <HStack gap={3} wrap="wrap" vAlign="end">
        <TextInput label="Salt (for hash/mask)" value={salt} onChange={setSalt} width="200px" />
        <VStack gap={1}>
          <Text type="label" display="block">IP</Text>
          <SegmentedControl label="IP mode" value={opts.ipMode} onChange={v => setOpts(p => ({ ...p, ipMode: v as typeof p.ipMode }))}>
            <SegmentedControlItem value="redact" label="Redact" />
            <SegmentedControlItem value="hash" label="Hash" />
            <SegmentedControlItem value="mask" label="Mask" />
          </SegmentedControl>
        </VStack>
        <VStack gap={1}>
          <Text type="label" display="block">User-Agent</Text>
          <SegmentedControl label="UA mode" value={opts.uaMode} onChange={v => setOpts(p => ({ ...p, uaMode: v as typeof p.uaMode }))}>
            <SegmentedControlItem value="redact" label="Redact" />
            <SegmentedControlItem value="hash" label="Hash" />
            <SegmentedControlItem value="keep" label="Keep" />
          </SegmentedControl>
        </VStack>
      </HStack>

      <HStack gap={3} wrap="wrap">
        <SegmentedControl label="Query secrets" value={opts.queryMode} onChange={v => setOpts(p => ({ ...p, queryMode: v as typeof p.queryMode }))}>
          <SegmentedControlItem value="redact" label="Redact" />
          <SegmentedControlItem value="hash" label="Hash" />
          <SegmentedControlItem value="keep" label="Keep" />
        </SegmentedControl>
        <SegmentedControl label="Emails" value={opts.emailMode} onChange={v => setOpts(p => ({ ...p, emailMode: v as typeof p.emailMode }))}>
          <SegmentedControlItem value="redact" label="Redact" />
          <SegmentedControlItem value="hash" label="Hash" />
          <SegmentedControlItem value="keep" label="Keep" />
        </SegmentedControl>
        <CopyButton value={result.output} />
      </HStack>

      <HStack gap={2} wrap="wrap" vAlign="center">
        <Text weight="semibold" display="block">Lines: {result.lines}</Text>
        {Object.entries(result.counts).map(([k, v]) => (
          <Token key={k} label={`${k}: ${v}`} size="sm" color="orange" />
        ))}
      </HStack>

      <CodeBlock code={result.output} language="plaintext" width="100%" maxHeight={360} isWrapped hasCopyButton={false} />

      <Banner status="info" title="Tip" description="For HAR/JSON captures use HAR Sanitizer; for structured CSV/JSON use CSV Anonymizer. This tool is line-oriented for raw access logs." />
    </VStack>
  );
}
