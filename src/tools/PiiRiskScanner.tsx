import { useMemo, useState } from 'react';
import { VStack, HStack } from '@astryxdesign/core/Layout';
import { TextArea } from '@astryxdesign/core/TextArea';
import { Text } from '@astryxdesign/core/Text';
import { Banner } from '@astryxdesign/core/Banner';
import { Token } from '@astryxdesign/core/Token';
import { scanPii, piiRiskScore } from '../lib/piiScan';

export default function PiiRiskScanner() {
  const [input, setInput] = useState('Hi team,\n\nPlease review:\n- Contact alice@example.com, +55 11 99999-1234\n- Card 4111 1111 1111 1111\n- Token Bearer eyJhbGciOi... and sk-abc123\n- Server 203.0.113.5\n- IBAN DE89 3704 0044 0532 0130 00\n\nThanks!');
  const findings = useMemo(() => scanPii(input), [input]);
  const score = useMemo(() => piiRiskScore(findings), [findings]);

  const levelColor: Record<string, string> = { low: 'green', medium: 'orange', high: 'red', critical: 'red' };

  return (
    <VStack gap={4}>
      <Text type="supporting" display="block">
        Scan free-text documents for PII before sharing. Reports emails, phones, cards, JWTs, PEM keys, IPs and IBAN patterns — scoring stays in this tab. No replacement, just detection.
      </Text>

      <TextArea label="Document" placeholder="Paste ticket, log snippet, or doc…" value={input} onChange={setInput} rows={8} hasSpellCheck={false} />

      <HStack gap={3} wrap="wrap" vAlign="center">
        <Text weight="semibold" display="block">Risk score: {score.score}/100</Text>
        <Token label={score.level.toUpperCase()} size="sm" color={levelColor[score.level] as 'green' | 'orange' | 'red'} />
        <Token label={`${findings.length} type(s) found`} size="sm" />
        <Text type="supporting" display="block">{findings.reduce((s,f)=>s+f.count,0)} total hit(s)</Text>
      </HStack>

      {findings.length === 0 ? (
        <Banner status="success" title="No PII patterns detected" description="No emails, phones, cards, JWTs, PEM keys, IPs or IBAN patterns found with current heuristics. Manual review still recommended — novel formats can be missed." />
      ) : (
        <VStack gap={2}>
          {findings.map(f => (
            <HStack key={f.kind} gap={2} wrap="wrap" vAlign="center">
              <Token label={f.label} size="sm" color={f.severity === 'high' ? 'red' : f.severity === 'medium' ? 'orange' : 'green'} />
              <Text type="supporting" display="block">×{f.count}</Text>
              <Text type="code" display="block">samples: {f.samples.join(', ')}</Text>
            </HStack>
          ))}
          <Banner status={score.level === 'critical' || score.level === 'high' ? 'error' : 'warning'} title={score.level === 'critical' ? 'Critical — do not share as-is' : score.level === 'high' ? 'High risk — redact before sharing' : 'Medium risk'} description="Use Secret Redactor to mask these, or Free-Text Pseudonymizer to preserve readability with pseudonyms. All processing is local." />
        </VStack>
      )}

      <Text type="supporting" display="block">For masking, see Secret Redactor. For deterministic pseudonyms (same email → same anon ID), see Free-Text Pseudonymizer and CSV Anonymizer.</Text>
    </VStack>
  );
}
