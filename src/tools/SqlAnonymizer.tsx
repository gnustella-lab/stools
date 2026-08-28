import { useMemo, useState } from 'react';
import { VStack, HStack } from '@astryxdesign/core/Layout';
import { TextArea } from '@astryxdesign/core/TextArea';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Text } from '@astryxdesign/core/Text';
import { Banner } from '@astryxdesign/core/Banner';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { Token } from '@astryxdesign/core/Token';
import { CopyButton } from '../components/CopyButton';
import { anonymizeSqlDump, parseInsertColumns, inferSqlStrategies, type SqlStrategy } from '../lib/sqlAnon';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';

export default function SqlAnonymizer() {
  const [input, setInput] = useState("INSERT INTO users (id, name, email, phone) VALUES (1, 'Alice', 'alice@example.com', '+55 11 99999-1234'), (2, 'Bob', 'bob@example.com', '+55 11 98888-7777');");
  const [salt, setSalt] = useState('sql-salt');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [columns, setColumns] = useState<string[]>(['id', 'name', 'email', 'phone']);
  const [config, setConfig] = useState<Record<string, SqlStrategy>>({ id: 'keep', name: 'pseudonymize', email: 'pseudonymize', phone: 'mask' });

  const parsedCols = useMemo(() => {
    const p = parseInsertColumns(input);
    return p?.columns ?? columns;
  }, [input, columns]);

  // sync columns when input changes
  useMemo(() => {
    const p = parseInsertColumns(input);
    if (p && JSON.stringify(p.columns) !== JSON.stringify(columns)) {
      setColumns(p.columns);
      setConfig(inferSqlStrategies(p.columns));
    }
  }, [input]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = () => {
    setError(null);
    try {
      const res = anonymizeSqlDump(input, config, { salt });
      setOutput(res.output);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setOutput('');
    }
  };

  return (
    <VStack gap={4}>
      <Text type="supporting" display="block">
        Mask SQL dump INSERTs locally: pseudonymize, hash, or redact columns before sharing a fixture. Deterministic with salt — same email → same anon.
      </Text>

      <TextArea label="SQL dump (INSERT … VALUES)" placeholder="INSERT INTO users (name, email) VALUES …" value={input} onChange={setInput} rows={6} hasSpellCheck={false} />

      <HStack gap={3} wrap="wrap" vAlign="end">
        <TextInput label="Salt" value={salt} onChange={setSalt} width="200px" />
        <CopyButton value={output} isDisabled={!output} />
        <button onClick={run} style={{ padding: '8px 16px', borderRadius: 'var(--radius-control)', background: 'var(--color-background-accent)', color: 'white', border: 'none', cursor: 'pointer' }}>Anonymize</button>
      </HStack>

      <VStack gap={2}>
        <Text weight="semibold" display="block">Per-column strategy (detected: {parsedCols.join(', ')})</Text>
        {parsedCols.map(col => (
          <HStack key={col} gap={2} wrap="wrap" vAlign="center">
            <Text type="label" display="block" wordBreak="break-all">{col}</Text>
            <SegmentedControl label={col} value={config[col] ?? 'keep'} onChange={v => setConfig(p => ({ ...p, [col]: v as SqlStrategy }))} layout="hug">
              <SegmentedControlItem value="keep" label="Keep" />
              <SegmentedControlItem value="pseudonymize" label="Pseudonymize" />
              <SegmentedControlItem value="hash" label="Hash" />
              <SegmentedControlItem value="mask" label="Mask" />
              <SegmentedControlItem value="redact" label="Redact" />
            </SegmentedControl>
          </HStack>
        ))}
      </VStack>

      {error && <Banner status="error" title="Error" description={error} />}
      {output && (
        <VStack gap={2}>
          <HStack gap={2} vAlign="center">
            <Text weight="semibold" display="block">Anonymized SQL</Text>
            <Token label={`${(output.match(/\),/g)?.length ?? 0) + 1} rows`} size="sm" />
          </HStack>
          <CodeBlock code={output} language="sql" width="100%" maxHeight={360} isWrapped hasCopyButton={false} />
        </VStack>
      )}

      <Banner status="warning" title="Honest limits" description="Best-effort parser for simple INSERT VALUES with 'single-quoted' strings. COPY, dollar quoting, or plpgsql blocks are not supported — review output." />
    </VStack>
  );
}
