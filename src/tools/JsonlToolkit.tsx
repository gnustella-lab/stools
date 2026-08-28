import { useMemo, useState } from 'react';
import { VStack, HStack } from '@astryxdesign/core/Layout';
import { TextArea } from '@astryxdesign/core/TextArea';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Text } from '@astryxdesign/core/Text';
import { Banner } from '@astryxdesign/core/Banner';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { Token } from '@astryxdesign/core/Token';
import { CopyButton } from '../components/CopyButton';
import { parseJsonl, filterJsonl, toJsonArray, toJsonl } from '../lib/jsonl';

export default function JsonlToolkit() {
  const [input, setInput] = useState('{"id":1,"status":"ok","email":"alice@example.com"}\n{"id":2,"status":"error","email":"bob@example.com"}\n{"id":3,"status":"ok"}');
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'jsonl' | 'array'>('array');

  const parsed = useMemo(() => parseJsonl(input), [input]);
  const filtered = useMemo(() => filterJsonl(parsed.lines, query), [parsed.lines, query]);
  const output = useMemo(() => {
    if (mode === 'array') return toJsonArray(filtered);
    return toJsonl(filtered);
  }, [filtered, mode]);

  return (
    <VStack gap={4}>
      <Text type="supporting" display="block">
        Format, validate, and filter JSON Lines / NDJSON locally. Great for anonymized log exports before sharing.
      </Text>

      <TextArea label="JSONL input (one JSON per line)" placeholder='{"a":1}\n{"a":2}' value={input} onChange={setInput} rows={7} hasSpellCheck={false} status={parsed.errors.length ? { type: 'error', message: `${parsed.errors.length} invalid line(s)` } : undefined} />

      <HStack gap={3} wrap="wrap" vAlign="center">
        <TextInput label="Filter (key=value or substring)" placeholder='status=ok or alice' value={query} onChange={setQuery} width="280px" />
        <HStack gap={2} vAlign="center">
          <button onClick={() => setMode('array')} style={{ padding: '6px 12px', borderRadius: 'var(--radius-control)', border: '1px solid var(--color-border)', background: mode === 'array' ? 'var(--color-background-muted)' : 'transparent', cursor: 'pointer' }}>JSON array</button>
          <button onClick={() => setMode('jsonl')} style={{ padding: '6px 12px', borderRadius: 'var(--radius-control)', border: '1px solid var(--color-border)', background: mode === 'jsonl' ? 'var(--color-background-muted)' : 'transparent', cursor: 'pointer' }}>JSONL</button>
        </HStack>
        <CopyButton value={output} />
      </HStack>

      <HStack gap={2} wrap="wrap">
        <Token label={`Total: ${parsed.total}`} size="sm" />
        <Token label={`Valid: ${parsed.valid}`} size="sm" color="green" />
        {parsed.errors.length > 0 && <Token label={`Errors: ${parsed.errors.length}`} size="sm" color="red" />}
        <Token label={`Filtered: ${filtered.length}`} size="sm" color="orange" />
      </HStack>

      {parsed.errors.length > 0 && (
        <VStack gap={1}>
          {parsed.errors.slice(0, 5).map(e => (
            <Text key={e.line} type="supporting" display="block">Line {e.line}: {e.message.slice(0, 120)}</Text>
          ))}
        </VStack>
      )}

      <CodeBlock code={output} language="json" width="100%" maxHeight={420} isWrapped hasCopyButton={false} />

      <Banner status="info" title="Local" description="Parsing and filtering run in memory. No upload. For column-wise anonymization, use CSV/JSON Anonymizer." />
    </VStack>
  );
}
