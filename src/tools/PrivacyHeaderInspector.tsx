import {useMemo, useState} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {TextArea} from '@astryxdesign/core/TextArea';
import {Text} from '@astryxdesign/core/Text';
import {Banner} from '@astryxdesign/core/Banner';
import {Token} from '@astryxdesign/core/Token';
import {Card} from '@astryxdesign/core/Card';
import {Divider} from '@astryxdesign/core/Divider';
import {Heading} from '@astryxdesign/core/Heading';
import {inspectResponseHeaders, type Severity} from '../lib/httpPrivacy';

function severityColor(severity: Severity) {
  if (severity === 'high') return 'red' as const;
  if (severity === 'medium') return 'orange' as const;
  if (severity === 'low') return 'yellow' as const;
  return 'gray' as const;
}

export default function PrivacyHeaderInspector() {
  const [input, setInput] = useState('');
  const result = useMemo(() => {
    if (!input.trim()) return null;
    try {
      return {data: inspectResponseHeaders(input), error: null as string | null};
    } catch (error) {
      return {data: null, error: error instanceof Error ? error.message : 'Could not inspect headers.'};
    }
  }, [input]);

  return (
    <VStack gap={4}>
      <Text color="secondary" display="block" textWrap="pretty">
        Paste HTTP response headers from DevTools, curl or a proxy to review referrer leakage, browser permissions, CSP,
        caching, CORS and implementation disclosure. The inspection happens only in this tab.
      </Text>

      <TextArea
        label="HTTP response headers"
        placeholder={'HTTP/2 200\nReferrer-Policy: strict-origin-when-cross-origin\nPermissions-Policy: camera=(), microphone=(), geolocation=()\nContent-Security-Policy: default-src \'self\'; img-src \'self\'\nCache-Control: no-store'}
        value={input}
        onChange={setInput}
        rows={8}
        hasSpellCheck={false}
      />

      {result?.error && <Banner status="error" title="Inspection failed" description={result.error} />}

      {result?.data && (
        <VStack gap={4}>
          <HStack gap={2} wrap="wrap">
            <Token label={`${result.data.stats.headers} headers`} size="sm" />
            <Token label={`${result.data.stats.setCookies} Set-Cookie`} size="sm" color={result.data.stats.setCookies > 0 ? 'orange' : 'gray'} />
            <Token label={`${result.data.findings.length} findings`} size="sm" color="orange" />
          </HStack>

          {result.data.headers.length > 0 && (
            <VStack gap={2}>
              <Heading level={3}>Relevant headers</Heading>
              {result.data.headers.map((header, index) => (
                <HStack key={`${header.name}-${index}`} gap={2} vAlign="start" wrap="wrap">
                  <Text weight="medium" display="block" style={{minWidth: 'var(--spacing-32)'}}>
                    {header.name}
                  </Text>
                  <Text type="code" display="block" wordBreak="break-all" style={{flex: 1, minWidth: 0}}>
                    {header.value}
                  </Text>
                </HStack>
              ))}
            </VStack>
          )}

          <VStack gap={3}>
            <Heading level={3}>Findings</Heading>
            {result.data.findings.map((item, index) => (
              <Card key={`${item.title}-${index}`} padding={4}>
                <VStack gap={1}>
                  <HStack gap={2} vAlign="center" wrap="wrap">
                    <Token label={item.severity} size="sm" color={severityColor(item.severity)} />
                    <Text weight="semibold" display="block">
                      {item.title}
                    </Text>
                  </HStack>
                  <Text color="secondary" display="block" textWrap="pretty">
                    {item.detail}
                  </Text>
                </VStack>
              </Card>
            ))}
          </VStack>
        </VStack>
      )}

      <Divider />
      <Text type="supporting" display="block" textWrap="pretty">
        Header analysis is advisory, not a penetration test. It cannot observe redirects, client-side scripts or the final
        browser policy after multiple responses. Review the full request flow before changing production headers.
      </Text>
    </VStack>
  );
}
