import { useMemo, useState } from 'react';
import { VStack, HStack } from '@astryxdesign/core/Layout';
import { TextArea } from '@astryxdesign/core/TextArea';
import { Text } from '@astryxdesign/core/Text';
import { Banner } from '@astryxdesign/core/Banner';
import { Token } from '@astryxdesign/core/Token';
import { inspectMarkdown } from '../lib/mdSanitize';

export default function MarkdownSanitizer() {
  const [input, setInput] = useState('# Hello\n\nSee ![tracker](https://tracker.example.com/pixel.png) and [link with utm](https://example.com/page?utm_source=newsletter)\n\n<script>alert(1)</script>\n\n<iframe src="https://evil.com"></iframe>');

  const report = useMemo(() => {
    try {
      return { data: inspectMarkdown(input), error: null as string | null };
    } catch (e) {
      return { data: null, error: e instanceof Error ? e.message : String(e) };
    }
  }, [input]);

  return (
    <VStack gap={4}>
      <Text type="supporting" display="block">
        Preview Markdown and surface trackers: external images (IP leak), utm/fbclid params, inline iframes and script tags — rendered locally with DOMParser.
      </Text>

      <TextArea label="Markdown" placeholder="# Title&#10;![alt](https://...)" value={input} onChange={setInput} rows={8} hasSpellCheck={false} />

      {report.error && <Banner status="error" title="Error" description={report.error} />}

      {report.data && (
        <VStack gap={3}>
          <HStack gap={2} wrap="wrap">
            <Token label={`${report.data.findings.length} finding(s)`} size="sm" />
            {report.data.findings.slice(0, 3).map((f, i) => (
              <Token key={i} label={f.title} size="sm" color={f.severity === 'high' ? 'red' : f.severity === 'medium' ? 'orange' : 'green'} />
            ))}
          </HStack>

          <VStack gap={1}>
            <Text weight="semibold" display="block">Findings</Text>
            {report.data.findings.map((f, i) => (
              <HStack key={i} gap={2} wrap="wrap" vAlign="center">
                <Token label={f.severity} size="sm" color={f.severity === 'high' ? 'red' : f.severity === 'medium' ? 'orange' : 'green'} />
                <Text weight="semibold" display="block">{f.title}</Text>
                <Text type="supporting" display="block">{f.detail}</Text>
              </HStack>
            ))}
          </VStack>

          <VStack gap={1}>
            <Text weight="semibold" display="block">HTML preview (sanitized render)</Text>
            <div
              style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-control)', padding: 12, background: 'var(--color-background-muted)', wordBreak: 'break-word' }}
              dangerouslySetInnerHTML={{ __html: report.data.htmlPreview }}
            />
            <Text type="supporting" display="block">Preview is rendered from Markdown in this tab only. No external resources are fetched — images are not loaded.</Text>
          </VStack>
        </VStack>
      )}

      <Banner status="info" title="Tip" description="For raw HTML audits use Tracker Inspector; for link cleaning use Link Cleaner." />
    </VStack>
  );
}
