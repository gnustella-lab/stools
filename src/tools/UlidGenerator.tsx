import { useMemo, useState } from 'react';
import { VStack, HStack } from '@astryxdesign/core/Layout';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Text } from '@astryxdesign/core/Text';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import { Banner } from '@astryxdesign/core/Banner';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { CopyButton } from '../components/CopyButton';
import { generateOrderedIds, type OrderedIdType } from '../lib/ulid';

export default function UlidGenerator() {
  const [type, setType] = useState<OrderedIdType>('ulid');
  const [count, setCount] = useState('10');
  const [prefix, setPrefix] = useState('');

  const { ids, error } = useMemo(() => {
    const n = parseInt(count, 10);
    if (Number.isNaN(n) || n < 1 || n > 5000) return { ids: [] as string[], error: 'Count must be 1–5000.' };
    try {
      const generated = generateOrderedIds(n, type);
      const withPrefix = prefix ? generated.map(id => `${prefix}${id}`) : generated;
      return { ids: withPrefix, error: null as string | null };
    } catch (e) {
      return { ids: [] as string[], error: e instanceof Error ? e.message : String(e) };
    }
  }, [count, type, prefix]);

  return (
    <VStack gap={4}>
      <Text type="supporting" display="block">
        Generate sortable, privacy-safe IDs offline. ULIDs are 26-char Crockford Base32 (timestamp + 80-bit randomness); KSUID-like variant uses similar scheme. All randomness from crypto.getRandomValues.
      </Text>

      <HStack gap={3} wrap="wrap" vAlign="end">
        <SegmentedControl label="Type" value={type} onChange={v => setType(v as OrderedIdType)}>
          <SegmentedControlItem value="ulid" label="ULID" />
          <SegmentedControlItem value="ksuid" label="KSUID-like" />
        </SegmentedControl>
        <TextInput label="Count (1–5000)" value={count} onChange={setCount} width="160px" />
        <TextInput label="Prefix (optional)" placeholder="ord_" value={prefix} onChange={setPrefix} width="160px" />
        <CopyButton value={ids.join('\n')} isDisabled={ids.length === 0} />
      </HStack>

      {error && <Banner status="error" title="Error" description={error} />}

      {ids.length > 0 && (
        <VStack gap={2}>
          <Text weight="semibold" display="block">{ids.length} IDs • {type.toUpperCase()} • monotonic per batch</Text>
          <CodeBlock code={ids.join('\n')} language="plaintext" width="100%" maxHeight={360} isWrapped hasCopyButton={false} />
          <Banner status="info" title="Offline & opaque" description="IDs contain a timestamp but no PII. They are not sequential database IDs — safe to expose in URLs/logs. For RFC 4122 v4, use UUID Generator." />
        </VStack>
      )}
    </VStack>
  );
}
