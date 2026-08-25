import {useMemo, useState} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {TextArea} from '@astryxdesign/core/TextArea';
import {Text} from '@astryxdesign/core/Text';
import {Banner} from '@astryxdesign/core/Banner';
import {Token} from '@astryxdesign/core/Token';
import {Card} from '@astryxdesign/core/Card';
import {Heading} from '@astryxdesign/core/Heading';
import {inspectHomograph} from '../lib/homograph';
import {OutputRow} from '../components/OutputRow';

function severityColor(severity: string) {
  if (severity === 'high') return 'red' as const;
  if (severity === 'medium') return 'orange' as const;
  if (severity === 'low') return 'yellow' as const;
  return 'gray' as const;
}

export default function HomographDetector() {
  const [input, setInput] = useState('');

  const report = useMemo(() => {
    if (!input.trim()) return null;
    return inspectHomograph(input);
  }, [input]);

  const lookalikes = report?.highlights.filter(item => item.lookalike) ?? [];

  return (
    <VStack gap={4}>
      <Text color="secondary" display="block" textWrap="pretty">
        Paste a URL, email or domain to reveal mixed scripts, punycode, zero-width characters and
        lookalikes that spoof Latin letters. Comparison runs locally with Unicode data - nothing is
        resolved on the network.
      </Text>

      <TextArea
        label="URL, email or domain"
        placeholder="https://exаmple.com/login  or  paypal.com  or  user@exаmple.com"
        value={input}
        onChange={setInput}
        rows={4}
        hasSpellCheck={false}
      />

      {report && (
        <VStack gap={4}>
          <HStack gap={2} wrap="wrap">
            <Token label={report.kind} size="sm" />
            {report.scripts.map(script => (
              <Token key={script} label={script} size="sm" color={report.mixedScript ? 'orange' : 'gray'} />
            ))}
            <Token
              label={`${report.findings.filter(item => item.severity !== 'info').length} warning${report.findings.filter(item => item.severity !== 'info').length === 1 ? '' : 's'}`}
              size="sm"
              color={report.mixedScript || lookalikes.length > 0 ? 'red' : 'gray'}
            />
          </HStack>

          {report.host && <OutputRow label="Host" value={report.host} />}
          {report.unicodeHost && report.unicodeHost !== report.host && (
            <OutputRow label="Unicode host" value={report.unicodeHost} />
          )}
          {report.punycodeHost && <OutputRow label="Punycode / ASCII" value={report.punycodeHost} />}

          <VStack gap={3}>
            <Heading level={3}>Findings</Heading>
            {report.findings.map((finding, index) => (
              <Card key={`${finding.title}-${index}`} padding={4}>
                <VStack gap={1}>
                  <HStack gap={2} vAlign="center">
                    <Token label={finding.severity} size="sm" color={severityColor(finding.severity)} />
                    <Text weight="semibold" display="block">
                      {finding.title}
                    </Text>
                  </HStack>
                  <Text color="secondary" display="block" textWrap="pretty">
                    {finding.detail}
                  </Text>
                  {finding.evidence && (
                    <Text type="code" display="block" wordBreak="break-all">
                      {finding.evidence}
                    </Text>
                  )}
                </VStack>
              </Card>
            ))}
          </VStack>

          {lookalikes.length > 0 && (
            <Card padding={4} variant="muted">
              <VStack gap={2}>
                <Text weight="semibold" display="block">
                  Lookalike characters
                </Text>
                {lookalikes.map(item => (
                  <Text key={`${item.index}-${item.hex}`} type="supporting" display="block">
                    {item.char} ({item.hex}, {item.script}) looks like {item.lookalike}
                  </Text>
                ))}
              </VStack>
            </Card>
          )}
        </VStack>
      )}

      {input.trim() && report && report.findings.every(item => item.severity === 'info') && (
        <Banner
          status="success"
          title="Looks clean"
          description="No mixed scripts, invisible characters or common lookalikes were found. Still compare the address bar before entering a password."
        />
      )}

      <Text type="supporting" display="block" textWrap="pretty">
        Homograph detection is heuristic. Novel confusables and some fonts can still fool a person
        even when this tool reports a clean result.
      </Text>
    </VStack>
  );
}
