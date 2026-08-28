import { useCallback, useState } from 'react';
import { VStack, HStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { FileInput } from '@astryxdesign/core/FileInput';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import { Banner } from '@astryxdesign/core/Banner';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { Switch } from '@astryxdesign/core/Switch';
import { CopyButton } from '../components/CopyButton';
import { OutputRow } from '../components/OutputRow';
import { asFile } from '../lib/files';
import { computeAllSri, buildTag, type SriAlgorithm } from '../lib/sri';

const ALGOS: SriAlgorithm[] = ['SHA-256', 'SHA-384', 'SHA-512'];

export default function SriGenerator() {
  const [mode, setMode] = useState<'text' | 'file'>('file');
  const [url, setUrl] = useState('');
  const [isStylesheet, setIsStylesheet] = useState(false);
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [results, setResults] = useState<Record<SriAlgorithm, { integrity: string; hex: string; base64: string }> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const compute = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      let buffer: ArrayBuffer;
      if (mode === 'text') {
        if (!text) throw new Error('Enter text or select a file.');
        buffer = new TextEncoder().encode(text).buffer;
      } else {
        if (!file) throw new Error('Select a file.');
        buffer = await file.arrayBuffer();
      }
      const all = await computeAllSri(buffer);
      const mapped = {
        'SHA-256': { integrity: all['SHA-256'].integrity, hex: all['SHA-256'].hex, base64: all['SHA-256'].base64 },
        'SHA-384': { integrity: all['SHA-384'].integrity, hex: all['SHA-384'].hex, base64: all['SHA-384'].base64 },
        'SHA-512': { integrity: all['SHA-512'].integrity, hex: all['SHA-512'].hex, base64: all['SHA-512'].base64 },
      };
      setResults(mapped);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, [mode, text, file]);

  return (
    <VStack gap={4}>
      <Text type="supporting" display="block">
        Generate Subresource Integrity (SRI) hashes locally. Drop an asset or paste text — digests are computed with Web Crypto and never leave this tab.
      </Text>

      <SegmentedControl label="Input source" value={mode} onChange={v => { setMode(v as typeof mode); setResults(null); setError(null); }}>
        <SegmentedControlItem value="file" label="File" />
        <SegmentedControlItem value="text" label="Text" />
      </SegmentedControl>

      {mode === 'file' ? (
        <FileInput label="Asset file" description="Any file — JS, CSS, image. Read in memory only." accept="*" value={file} onChange={v => { setFile(asFile(v)); setResults(null); }} />
      ) : (
        <TextInput label="Text" placeholder="Paste asset content…" value={text} onChange={setText} />
      )}

      <HStack gap={3} wrap="wrap" vAlign="end">
        <TextInput label="Resource URL (for tag)" placeholder="https://cdn.example.com/app.js" value={url} onChange={setUrl} width="320px" />
        <Switch label="Stylesheet (<link>)" value={isStylesheet} onChange={setIsStylesheet} />
      </HStack>

      <HStack gap={3}>
        <button
          onClick={() => void compute()}
          disabled={loading}
          style={{ padding: '8px 16px', borderRadius: 'var(--radius-control)', background: 'var(--color-background-accent)', color: 'white', border: 'none', cursor: 'pointer', opacity: loading ? 0.6 : 1 }}
        >
          {loading ? 'Computing…' : 'Generate SRI'}
        </button>
        {results && <CopyButton value={results['SHA-384'].integrity} label="Copy SHA-384" />}
      </HStack>

      {error && <Banner status="error" title="Error" description={error} />}

      {results && (
        <VStack gap={3}>
          <Text weight="semibold" display="block">Integrity values</Text>
          {ALGOS.map(algo => (
            <VStack key={algo} gap={1}>
              <HStack gap={2} vAlign="center">
                <Text weight="semibold" display="block">{algo}</Text>
                <CopyButton value={results[algo].integrity} label="Copy integrity" />
              </HStack>
              <Text type="code" display="block" wordBreak="break-all">{results[algo].integrity}</Text>
              <Text type="supporting" display="block" wordBreak="break-all">hex: {results[algo].hex}</Text>
              {url && (
                <CodeBlock code={buildTag(url.trim() || 'https://example.com/asset.js', results[algo].integrity, isStylesheet)} language="html" width="100%" isWrapped hasCopyButton />
              )}
            </VStack>
          ))}
          <Banner status="info" title="How to use" description="Add the integrity attribute and crossorigin=anonymous to your <script> or <link>. The browser will block the resource if the bytes don't match." />
        </VStack>
      )}

      <VStack gap={1}>
        <Text type="supporting" display="block">Honest limits: SRI checks integrity, not authenticity. It doesn't protect you if the CDN URL itself is tampered with before the page loads. Always serve your HTML over HTTPS.</Text>
        <OutputRow label="Algorithms" value="SHA-256 / SHA-384 (recommended) / SHA-512" />
      </VStack>
    </VStack>
  );
}
