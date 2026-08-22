import {HStack} from '@astryxdesign/core/Layout';
import {Text} from '@astryxdesign/core/Text';
import {CopyButton} from './CopyButton';

export function OutputRow({label, value}: {label: string; value: string | null}) {
  return (
    <HStack gap={3} vAlign="center" wrap="wrap">
      <Text type="label" display="block">
        {label}
      </Text>
      <Text type="code" display="block" wordBreak="break-all">
        {value ?? '—'}
      </Text>
      {value ? <CopyButton value={value} label="Copy" /> : null}
    </HStack>
  );
}
