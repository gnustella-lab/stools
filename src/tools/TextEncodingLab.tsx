import { useMemo, useState } from 'react';
import { VStack, HStack } from '@astryxdesign/core/Layout';
import { TextArea } from '@astryxdesign/core/TextArea';
import { Text } from '@astryxdesign/core/Text';
import { Banner } from '@astryxdesign/core/Banner';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import { CopyButton } from '../components/CopyButton';
import { OutputRow } from '../components/OutputRow';
import { toHtmlEntities, fromHtmlEntities, toUnicodeEscapes, fromUnicodeEscapes, toBase64, fromBase64, toQuotedPrintable, fromQuotedPrintable, detectMojibake } from '../lib/encoding';

type Mode = 'encode' | 'decode';

export default function TextEncodingLab() {
  const [input, setInput] = useState('Hello — café & naïve  €');
  const [mode, setMode] = useState<Mode>('encode');
  const [target, setTarget] = useState<'html' | 'unicode' | 'base64' | 'url' | 'qp'>('html');

  const result = useMemo(() => {
    if (!input) return { output: '', error: null as string | null, warnings: [] as string[] };
    try {
      let out = '';
      if (mode === 'encode') {
        if (target === 'html') out = toHtmlEntities(input);
        else if (target === 'unicode') out = toUnicodeEscapes(input);
        else if (target === 'base64') out = toBase64(input);
        else if (target === 'url') out = encodeURIComponent(input);
        else if (target === 'qp') out = toQuotedPrintable(input);
      } else {
        if (target === 'html') out = fromHtmlEntities(input);
        else if (target === 'unicode') out = fromUnicodeEscapes(input);
        else if (target === 'base64') out = fromBase64(input);
        else if (target === 'url') out = decodeURIComponent(input);
        else if (target === 'qp') out = fromQuotedPrintable(input);
      }
      const warnings = detectMojibake(mode === 'decode' ? out : input);
      return { output: out, error: null, warnings };
    } catch (e) {
      return { output: '', error: e instanceof Error ? e.message : String(e), warnings: [] };
    }
  }, [input, mode, target]);

  const quick = useMemo(() => {
    if (!input) return [];
    try {
      return [
        { label: 'HTML entities', value: toHtmlEntities(input).slice(0, 120) },
        { label: 'URL encode', value: encodeURIComponent(input).slice(0, 120) },
        { label: 'Base64', value: toBase64(input).slice(0, 120) },
        { label: 'Unicode \\u', value: toUnicodeEscapes(input).slice(0, 120) },
      ];
    } catch { return []; }
  }, [input]);

  return (
    <VStack gap={4}>
      <Text type="supporting" display="block">
        Convert text between HTML entities, URL encoding, Base64, Unicode escapes, and Quoted-Printable — all offline with TextEncoder/DOMParser.
      </Text>

      <HStack gap={3} wrap="wrap">
        <SegmentedControl label="Direction" value={mode} onChange={v => setMode(v as Mode)}>
          <SegmentedControlItem value="encode" label="Encode" />
          <SegmentedControlItem value="decode" label="Decode" />
        </SegmentedControl>
        <SegmentedControl label="Encoding" value={target} onChange={v => setTarget(v as typeof target)}>
          <SegmentedControlItem value="html" label="HTML" />
          <SegmentedControlItem value="url" label="URL" />
          <SegmentedControlItem value="base64" label="Base64" />
          <SegmentedControlItem value="unicode" label="Unicode" />
          <SegmentedControlItem value="qp" label="QP" />
        </SegmentedControl>
        <CopyButton value={result.output} />
      </HStack>

      <TextArea
        label={mode === 'encode' ? 'Plain text' : `Encoded (${target})`}
        placeholder={mode === 'encode' ? 'Type or paste text…' : 'Paste encoded text to decode…'}
        value={input}
        onChange={setInput}
        rows={5}
        hasSpellCheck={false}
        status={result.error ? { type: 'error', message: result.error } : undefined}
      />

      {result.output && (
        <VStack gap={2}>
          <Text weight="semibold" display="block">Output</Text>
          <Text type="code" display="block" wordBreak="break-all">{result.output}</Text>
          {result.warnings.length > 0 && <Banner status="warning" title="Possible mojibake" description={result.warnings.join(' ')} />}
        </VStack>
      )}

      {mode === 'encode' && quick.length > 0 && (
        <VStack gap={2}>
          <Text weight="semibold" display="block">Quick preview (all encodings)</Text>
          {quick.map(q => (
            <OutputRow key={q.label} label={q.label} value={q.value} />
          ))}
        </VStack>
      )}

      <Banner status="info" title="Offline" description="Uses only browser APIs (TextEncoder, atob/btoa, DOMParser). No data leaves this tab." />
    </VStack>
  );
}
