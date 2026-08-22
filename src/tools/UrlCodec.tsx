import {useMemo, useState} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {TextArea} from '@astryxdesign/core/TextArea';
import {SegmentedControl, SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';
import {Switch} from '@astryxdesign/core/Switch';
import {Text} from '@astryxdesign/core/Text';
import {CodeBlock} from '@astryxdesign/core/CodeBlock';
import {CopyButton} from '../components/CopyButton';

type Mode = 'encode' | 'decode';

export default function UrlCodec() {
  const [mode, setMode] = useState<Mode>('encode');
  const [componentMode, setComponentMode] = useState(true);
  const [input, setInput] = useState('');

  const result = useMemo(() => {
    if (!input) return {output: '', error: null as string | null};
    try {
      if (mode === 'encode') {
        const output = componentMode
          ? encodeURIComponent(input)
          : encodeURI(input);
        return {output, error: null};
      }
      const output = componentMode
        ? decodeURIComponent(input)
        : decodeURI(input);
      return {output, error: null};
    } catch (e) {
      const detail =
        e instanceof URIError
          ? 'Malformed percent-encoding (a % must be followed by two hex digits).'
          : 'Could not process the input.';
      return {output: '', error: detail};
    }
  }, [input, mode, componentMode]);

  return (
    <VStack gap={4}>
      <HStack gap={4} wrap="wrap" vAlign="end">
        <SegmentedControl label="Direction" value={mode} onChange={v => setMode(v as Mode)}>
          <SegmentedControlItem value="encode" label="Encode" />
          <SegmentedControlItem value="decode" label="Decode" />
        </SegmentedControl>
        <Switch
          label={mode === 'encode' ? 'Escape all reserved characters' : 'Decode full URI'}
          description={
            mode === 'encode'
              ? 'On: encodeURIComponent (escapes /, ?, &, =…). Off: encodeURI (keeps URL structure).'
              : 'On: decodeURIComponent (decodes every escape). Off: decodeURI (preserves separators).'
          }
          value={componentMode}
          onChange={setComponentMode}
        />
        <CopyButton value={result.output} />
      </HStack>

      <TextArea
        label={mode === 'encode' ? 'Text to encode' : 'Encoded text'}
        placeholder={
          mode === 'encode'
            ? 'https://example.com/search?q=hello world&lang=en'
            : 'https%3A%2F%2Fexample.com%2Fsearch%3Fq%3Dhello%20world'
        }
        value={input}
        onChange={setInput}
        rows={5}
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
            maxHeight={240}
            isWrapped
            hasCopyButton={false}
          />
        </VStack>
      )}
    </VStack>
  );
}
