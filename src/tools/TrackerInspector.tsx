import {useMemo, useState} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {TextArea} from '@astryxdesign/core/TextArea';
import {Button} from '@astryxdesign/core/Button';
import {Text} from '@astryxdesign/core/Text';
import {Banner} from '@astryxdesign/core/Banner';
import {Token} from '@astryxdesign/core/Token';
import {Card} from '@astryxdesign/core/Card';
import {Divider} from '@astryxdesign/core/Divider';
import {Heading} from '@astryxdesign/core/Heading';
import {CodeBlock} from '@astryxdesign/core/CodeBlock';
import {CopyButton} from '../components/CopyButton';
import {inspectHtml, sanitizeHtml} from '../lib/tracker';

function severityColor(s: string) {
  if (s === 'high') return 'red' as const;
  if (s === 'medium') return 'orange' as const;
  if (s === 'low') return 'yellow' as const;
  return 'gray' as const;
}

export default function TrackerInspector() {
  const [input, setInput] = useState('');
  const [sanitized, setSanitized] = useState<string | null>(null);

  const result = useMemo(() => {
    if (!input.trim()) return null;
    try {
      return {data: inspectHtml(input), error: null as string | null};
    } catch (e) {
      return {data: null, error: e instanceof Error ? e.message : 'Could not inspect.'};
    }
  }, [input]);

  const handleSanitize = () => {
    try {
      setSanitized(sanitizeHtml(input));
    } catch (e) {
      setSanitized(e instanceof Error ? `Error: ${e.message}` : 'Could not sanitize.');
    }
  };

  return (
    <VStack gap={4}>
      <Text color="secondary" display="block" textWrap="pretty">
        Paste HTML from a newsletter, landing page or copied email source. The inspector enumerates 1×1 pixels, tracker
        scripts, hidden iframes and links with <Text type="code">utm_*</Text> / <Text type="code">fbclid</Text> using only{' '}
        <Text type="code">DOMParser</Text>. Optionally sanitize it locally before sharing.
      </Text>

      <TextArea
        label="HTML to inspect"
        placeholder={`<html><body>\n  <img src="https://tracker.test/pixel.gif" width="1" height="1">\n  <script src="https://googletagmanager.com/gtag/js?id=UA-XXXX"></script>\n  <iframe src="https://tracker.test/beacon" style="display:none"></iframe>\n  <a href="https://example.com/?utm_source=newsletter&fbclid=xxx">Offer</a>\n</body></html>`}
        value={input}
        onChange={v => {
          setInput(v);
          setSanitized(null);
        }}
        rows={10}
        hasSpellCheck={false}
      />

      {result?.error && <Banner status="error" title="Inspection failed" description={result.error} />}

      {result?.data && (
        <VStack gap={4}>
          <HStack gap={2} wrap="wrap">
            <Token label={`${result.data.stats.images} images`} size="sm" />
            <Token label={`${result.data.stats.scripts} scripts`} size="sm" color={result.data.stats.scripts > 0 ? 'orange' : 'gray'} />
            <Token label={`${result.data.stats.iframes} iframes`} size="sm" />
            <Token label={`${result.data.stats.links} links`} size="sm" />
            <Token label={`${result.data.stats.pixels} pixels`} size="sm" color={result.data.stats.pixels > 0 ? 'red' : 'gray'} />
          </HStack>

          <VStack gap={3}>
            <HStack gap={3} vAlign="center" wrap="wrap">
              <Heading level={3}>Findings ({result.data.findings.length})</Heading>
              <Button label="Sanitize HTML locally" variant="secondary" onClick={handleSanitize} />
              {sanitized && <CopyButton value={sanitized} />}
            </HStack>

            {result.data.findings.map((f, idx) => (
              <Card key={`${f.title}-${idx}`} padding={4}>
                <VStack gap={1}>
                  <HStack gap={2} vAlign="center" wrap="wrap">
                    <Token label={f.severity} size="sm" color={severityColor(f.severity)} />
                    <Text weight="semibold" display="block">
                      {f.title}
                    </Text>
                    {typeof f.count === 'number' && <Token label={`${f.count}`} size="sm" />}
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

          {sanitized && (
            <VStack gap={2}>
              <Text weight="semibold" display="block">
                Sanitized HTML (pixels removed, tracker params stripped)
              </Text>
              <CodeBlock code={sanitized} language="html" width="100%" maxHeight={400} isWrapped hasCopyButton={false} />
              <Banner
                status="info"
                title="Review before publishing"
                description="Sanitization is heuristic (1×1, known tracker domains, utm_*/fbclid). Check that the page still renders and no required scripts were removed."
              />
            </VStack>
          )}
        </VStack>
      )}

      <Divider />
      <Text type="supporting" display="block" textWrap="pretty">
        All parsing runs with the browser&apos;s built-in HTML parser. No network request is made - verify in the Network
        panel.
      </Text>
    </VStack>
  );
}
