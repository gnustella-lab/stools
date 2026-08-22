import {useState} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {NumberInput} from '@astryxdesign/core/NumberInput';
import {Selector} from '@astryxdesign/core/Selector';
import {Button} from '@astryxdesign/core/Button';
import {CopyButton} from '../components/CopyButton';
import {Text} from '@astryxdesign/core/Text';
import {CodeBlock} from '@astryxdesign/core/CodeBlock';
import {secureRandomBytes} from '../lib/random';

type Format = 'plain' | 'uppercase' | 'braces' | 'nohyphens';

function formatUuid(raw: string, format: Format): string {
  switch (format) {
    case 'uppercase':
      return raw.toUpperCase();
    case 'braces':
      return `{${raw}}`;
    case 'nohyphens':
      return raw.replaceAll('-', '');
    default:
      return raw;
  }
}

function generateV4(): string {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = secureRandomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export default function UuidGenerator() {
  const [count, setCount] = useState(5);
  const [format, setFormat] = useState<Format>('plain');
  const [uuids, setUuids] = useState<string[]>([]);

  const generate = () => {
    const n = Math.min(Math.max(Math.round(count || 1), 1), 500);
    setUuids(Array.from({length: n}, () => formatUuid(generateV4(), format)));
  };

  return (
    <VStack gap={4}>
      <HStack gap={4} wrap="wrap" vAlign="end">
        <NumberInput
          label="How many"
          value={count}
          onChange={setCount}
          min={1}
          max={500}
          isIntegerOnly
          hasNumberSteppers
        />
        <Selector
          label="Format"
          value={format}
          onChange={value => setFormat(value as Format)}
          options={[
            {value: 'plain', label: 'Standard (lowercase)'},
            {value: 'uppercase', label: 'Uppercase'},
            {value: 'braces', label: 'Wrapped in braces'},
            {value: 'nohyphens', label: 'Without hyphens'},
          ]}
        />
        <Button label="Generate" variant="primary" onClick={generate} />
        <CopyButton value={uuids.join('\n')} />
      </HStack>

      {uuids.length === 0 ? (
        <Text type="supporting" display="block">
          Choose a quantity and click Generate. UUID v4 values come from the
          browser's cryptographically secure random source.
        </Text>
      ) : (
        <CodeBlock
          code={uuids.join('\n')}
          language="plaintext"
          width="100%"
          maxHeight={420}
          hasLineNumbers={uuids.length > 1}
        />
      )}
    </VStack>
  );
}
