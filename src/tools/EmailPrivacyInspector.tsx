import {useMemo, useState} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {TextArea} from '@astryxdesign/core/TextArea';
import {Text} from '@astryxdesign/core/Text';
import {Banner} from '@astryxdesign/core/Banner';
import {Token} from '@astryxdesign/core/Token';
import {Card} from '@astryxdesign/core/Card';
import {Divider} from '@astryxdesign/core/Divider';
import {Heading} from '@astryxdesign/core/Heading';
import {inspectEmail} from '../lib/emailInspector';

function severityColor(s: string) {
  if (s === 'high') return 'red' as const;
  if (s === 'medium') return 'orange' as const;
  if (s === 'low') return 'yellow' as const;
  return 'gray' as const;
}

export default function EmailPrivacyInspector() {
  const [input, setInput] = useState('');

  const result = useMemo(() => {
    if (!input.trim()) return null;
    try {
      return {data: inspectEmail(input), error: null as string | null};
    } catch (e) {
      return {data: null, error: e instanceof Error ? e.message : 'Could not inspect.'};
    }
  }, [input]);

  const hasError = Boolean(result?.error);

  return (
    <VStack gap={4}>
      <Text color="secondary" display="block" textWrap="pretty">
        Paste the raw source of an email (File → Show original / View source) to reveal hidden tracking pixels,
        mismatched Reply-To, bulk-mail flags and link trackers. Parsing uses only <Text type="code">DOMParser</Text> and
        regex — nothing is sent anywhere.
      </Text>

      <TextArea
        label="Raw email source"
        placeholder={`From: billing@example.com <billing@example.com>\nReply-To: other@tracker.test\nReturn-Path: <bounces@tracker.test>\nAuthentication-Results: spf=fail\nX-Mailer: SendGrid\nList-Unsubscribe: <https://example.com/unsubscribe>\n\n<html><body>\n  <img src="https://tracker.test/open?uid=123" width="1" height="1">\n  <a href="https://example.com?utm_source=newsletter&utm_medium=email">View invoice</a>\n</body></html>`}
        value={input}
        onChange={setInput}
        rows={12}
        hasSpellCheck={false}
      />

      {hasError && <Banner status="error" title="Inspection failed" description={result?.error ?? ''} />}

      {result?.data && (
        <VStack gap={4}>
          <HStack gap={2} wrap="wrap">
            <Token label={`${result.data.stats.links} links`} size="sm" />
            <Token label={`${result.data.stats.externalImages} images`} size="sm" />
            <Token label={`${result.data.stats.trackingParams} tracking params`} size="sm" color="orange" />
            <Token label={`${result.data.findings.length} findings`} size="sm" color="orange" />
          </HStack>

          {Object.keys(result.data.headers).length > 0 && (
            <Card padding={4} variant="muted">
              <VStack gap={2}>
                <Text weight="semibold" display="block">
                  Key headers
                </Text>
                {Object.entries(result.data.headers).map(([k, v]) => (
                  <HStack key={k} gap={2} wrap="wrap" vAlign="start">
                    <Text weight="medium" display="block" style={{minWidth: 160}}>
                      {k}
                    </Text>
                    <Text type="supporting" display="block" wordBreak="break-all">
                      {v}
                    </Text>
                  </HStack>
                ))}
              </VStack>
            </Card>
          )}

          <VStack gap={3}>
            <Heading level={3}>Findings</Heading>
            {result.data.findings.map((f, idx) => (
              <Card key={`${f.title}-${idx}`} padding={4}>
                <VStack gap={1}>
                  <HStack gap={2} vAlign="center">
                    <Token label={f.severity} size="sm" color={severityColor(f.severity)} />
                    <Text weight="semibold" display="block">
                      {f.title}
                    </Text>
                  </HStack>
                  <Text color="secondary" display="block" textWrap="pretty">
                    {f.detail}
                  </Text>
                  {f.evidence && (
                    <Text type="code" display="block" wordBreak="break-all">
                      {f.evidence}
                    </Text>
                  )}
                </VStack>
              </Card>
            ))}
          </VStack>

          <Card padding={4} variant="muted">
            <VStack gap={2}>
              <Text weight="semibold" display="block">
                Body snippet
              </Text>
              <Text type="code" display="block" wordBreak="break-all">
                {result.data.bodySnippet || '(no body)'}
              </Text>
            </VStack>
          </Card>
        </VStack>
      )}

      <Divider />

      <Text type="supporting" display="block" textWrap="pretty">
        Tip: copy tracking URLs into <Text weight="semibold">Link Cleaner</Text> before opening them. For images, block
        remote content in your mail client and strip metadata before forwarding.
      </Text>
    </VStack>
  );
}
