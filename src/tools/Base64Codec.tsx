import {useMemo, useState} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {TextArea} from '@astryxdesign/core/TextArea';
import {SegmentedControl, SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';
import {Switch} from '@astryxdesign/core/Switch';
import {Text} from '@astryxdesign/core/Text';
import {CodeBlock} from '@astryxdesign/core/CodeBlock';
import {CopyButton} from '../components/CopyButton';

type Mode = 'encode' | 'decode';

function encodeBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  bytes.forEach(b => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

function decodeBase64(text: string): string {
  const normalized = text
    .trim()
    .replaceAll('-', '+')
    .replaceAll('_', '/')
    .replace(/\s+/g, '');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, ch => ch.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export default function Base64Codec() {
  const [mode, setMode] = useState<Mode>('encode');
  const [input, setInput] = useState('');
  const [urlSafe, setUrlSafe] = useState(false);

  const result = useMemo(() => {
    const trimmed = input;
    if (!trimmed) return {output: '', error: null as string | null};
    try {
      if (mode === 'encode') {
        let output = encodeBase64(trimmed);
        if (urlSafe) {
          output = output.replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
        }
        return {output, error: null};
      }
      return {output: decodeBase64(trimmed), error: null};
    } catch {
      return {
        output: '',
        error: 'Input is not valid Base64. Check for stray characters or padding.',
      };
    }
  }, [input, mode, urlSafe]);

  return (
    <VStack gap={4}>
      <HStack gap={4} wrap="wrap" vAlign="end">
        <SegmentedControl label="Direction" value={mode} onChange={v => setMode(v as Mode)}>
          <SegmentedControlItem value="encode" label="Encode" />
          <SegmentedControlItem value="decode" label="Decode" />
        </SegmentedControl>
        {mode === 'encode' && (
          <Switch
            label="URL-safe alphabet (-, _)"
            value={urlSafe}
            onChange={setUrlSafe}
          />
        )}
        <CopyButton value={result.output} />
      </HStack>

      <TextArea
        label={mode === 'encode' ? 'Plain text' : 'Base64 input'}
        placeholder={
          mode === 'encode'
            ? 'Type or paste text to encode…'
            : 'Paste Base64 to decode…'
        }
        value={input}
        onChange={setInput}
        rows={6}
        hasSpellCheck={false}
        status={
          result.error ? {type: 'error' as const, message: result.error} : undefined
        }
      />

      {result.output && (
        <VStack gap={2}>
          <Text weight="semibold" display="block">
            Output
          </Text>
          <CodeBlock
            code={result.output}
            language="plaintext"
            width="100%"
            maxHeight={300}
            isWrapped
            hasCopyButton={false}
          />
        </VStack>
      )}
    </VStack>
  );
}
