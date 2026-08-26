import {useMemo, useState} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {TextArea} from '@astryxdesign/core/TextArea';
import {Text} from '@astryxdesign/core/Text';
import {Banner} from '@astryxdesign/core/Banner';
import {Token} from '@astryxdesign/core/Token';
import {Card} from '@astryxdesign/core/Card';
import {Divider} from '@astryxdesign/core/Divider';
import {Heading} from '@astryxdesign/core/Heading';
import {inspectCookies, type Severity} from '../lib/httpPrivacy';

function severityColor(severity: Severity) {
  if (severity === 'high') return 'red' as const;
  if (severity === 'medium') return 'orange' as const;
  if (severity === 'low') return 'yellow' as const;
  return 'gray' as const;
}

export default function CookieInspector() {
  const [input, setInput] = useState('');
  const result = useMemo(() => {
    if (!input.trim()) return null;
    try {
      return {data: inspectCookies(input), error: null as string | null};
    } catch (error) {
      return {data: null, error: error instanceof Error ? error.message : 'Could not inspect cookies.'};
    }
  }, [input]);

  return (
    <VStack gap={4}>
      <Text color="secondary" display="block" textWrap="pretty">
        Paste one or more <Text type="code">Set-Cookie</Text> response headers, or a <Text type="code">Cookie</Text> request
        header, to review tracking-like names, scope, lifetime and browser flags. Cookie values are deliberately never shown in
        the results.
      </Text>

      <TextArea
        label="Cookie headers"
        placeholder={'Set-Cookie: session=secret; Path=/; Secure; HttpOnly; SameSite=Lax\nSet-Cookie: _ga=analytics-id; Max-Age=63072000; Path=/'}
        value={input}
        onChange={setInput}
        rows={7}
        hasSpellCheck={false}
      />

      {result?.error && <Banner status="error" title="Inspection failed" description={result.error} />}

      {result?.data && (
        <VStack gap={4}>
          <HStack gap={2} wrap="wrap">
            <Token label={`${result.data.cookies.length} cookie${result.data.cookies.length === 1 ? '' : 's'}`} size="sm" />
            <Token label={`${result.data.stats.setCookies} response`} size="sm" />
            <Token label={`${result.data.stats.requestCookies} request`} size="sm" />
            <Token label={`${result.data.stats.likelyTracking} tracking-like`} size="sm" color={result.data.stats.likelyTracking > 0 ? 'orange' : 'gray'} />
            <Token label={`${result.data.stats.weakConfigurations} review`} size="sm" color={result.data.stats.weakConfigurations > 0 ? 'orange' : 'gray'} />
          </HStack>

          <VStack gap={3}>
            <Heading level={3}>Cookies</Heading>
            {result.data.cookies.map((cookie, index) => (
              <Card key={`${cookie.source}-${cookie.name}-${index}`} padding={4}>
                <VStack gap={2}>
                  <HStack gap={2} wrap="wrap" vAlign="center">
                    <Text weight="semibold" display="block" wordBreak="break-all">
                      {cookie.name}
                    </Text>
                    <Token label={cookie.source} size="sm" />
                    {cookie.attributes.map(attribute => <Token key={attribute} label={attribute} size="sm" color="gray" />)}
                  </HStack>
                  {cookie.attributes.length === 0 && (
                    <Text type="supporting" color="secondary" display="block">
                      No attributes are sent with a Cookie request header.
                    </Text>
                  )}
                  {cookie.findings.map((item, findingIndex) => (
                    <HStack key={`${item.title}-${findingIndex}`} gap={2} vAlign="start" wrap="wrap">
                      <Token label={item.severity} size="sm" color={severityColor(item.severity)} />
                      <VStack gap={0.5} style={{flex: 1, minWidth: 0}}>
                        <Text weight="medium" display="block">
                          {item.title}
                        </Text>
                        <Text type="supporting" color="secondary" display="block" textWrap="pretty">
                          {item.detail}
                        </Text>
                      </VStack>
                    </HStack>
                  ))}
                </VStack>
              </Card>
            ))}
          </VStack>
        </VStack>
      )}

      <Divider />
      <Text type="supporting" display="block" textWrap="pretty">
        This is a local, heuristic configuration review. A cookie can be necessary even when it is readable by JavaScript or
        long-lived; verify each one against its documented purpose and consent policy.
      </Text>
    </VStack>
  );
}
