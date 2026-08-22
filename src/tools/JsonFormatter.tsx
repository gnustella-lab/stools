import {useMemo, useState} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {TextArea} from '@astryxdesign/core/TextArea';
import {SegmentedControl, SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';
import {Selector} from '@astryxdesign/core/Selector';
import {Text} from '@astryxdesign/core/Text';
import {CodeBlock} from '@astryxdesign/core/CodeBlock';
import {CopyButton} from '../components/CopyButton';

type Mode = 'format' | 'minify';

function indentStringFor(value: string): string {
  if (value === 'tab') return '\t';
  const size = Number(value);
  return ' '.repeat(size);
}

export default function JsonFormatter() {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<Mode>('format');
  const [indent, setIndent] = useState('2');

  const result = useMemo(() => {
    const trimmed = input.trim();
    if (!trimmed) {
      return {output: '', error: null as string | null};
    }
    try {
      const parsed: unknown = JSON.parse(trimmed);
      const output =
        mode === 'minify'
          ? JSON.stringify(parsed)
          : JSON.stringify(parsed, null, indentStringFor(indent));
      return {output, error: null};
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Invalid JSON';
      return {output: '', error: message};
    }
  }, [input, mode, indent]);

  const valid = input.trim().length > 0 && !result.error;

  return (
    <VStack gap={4}>
      <HStack gap={4} wrap="wrap" vAlign="end">
        <SegmentedControl label="Operation" value={mode} onChange={v => setMode(v as Mode)}>
          <SegmentedControlItem value="format" label="Format" />
          <SegmentedControlItem value="minify" label="Minify" />
        </SegmentedControl>
        {mode === 'format' && (
          <Selector
            label="Indentation"
            value={indent}
            onChange={setIndent}
            options={[
              {value: '2', label: '2 spaces'},
              {value: '4', label: '4 spaces'},
              {value: 'tab', label: 'Tab'},
            ]}
          />
        )}
        <CopyButton value={result.output} />
      </HStack>

      <TextArea
        label="JSON input"
        placeholder='{"paste": "your JSON here"}'
        value={input}
        onChange={setInput}
        rows={8}
        hasSpellCheck={false}
        status={
          input.trim() === ''
            ? undefined
            : valid
              ? {type: 'success' as const, message: 'Valid JSON'}
              : {type: 'error' as const, message: result.error ?? 'Invalid JSON'}
        }
      />

      {result.output && (
        <VStack gap={2}>
          <Text weight="semibold" display="block">
            Output
          </Text>
          <CodeBlock
            code={result.output}
            language="json"
            width="100%"
            maxHeight={420}
            hasLineNumbers
            hasCopyButton={false}
          />
        </VStack>
      )}
    </VStack>
  );
}
