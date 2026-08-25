import {useState} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Slider} from '@astryxdesign/core/Slider';
import {SegmentedControl, SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';
import {Button} from '@astryxdesign/core/Button';
import {Text} from '@astryxdesign/core/Text';
import {Card} from '@astryxdesign/core/Card';
import {Token} from '@astryxdesign/core/Token';
import {CodeBlock} from '@astryxdesign/core/CodeBlock';
import {CopyButton} from '../components/CopyButton';
import {downloadBlob} from '../lib/files';
import {
  generateIdentities,
  identitiesToCsv,
  type FakeIdentity,
  type IdentityLocale,
} from '../lib/identity';

function asLocale(value: string): IdentityLocale {
  if (value === 'us' || value === 'intl') return value;
  return 'br';
}

export default function IdentityGenerator() {
  const [locale, setLocale] = useState('br');
  const [count, setCount] = useState(3);
  const [rows, setRows] = useState<FakeIdentity[]>(() => generateIdentities(3, 'br'));

  const json = JSON.stringify(rows, null, 2);
  const csv = identitiesToCsv(rows);

  const regenerate = (nextCount = count, nextLocale = locale) => {
    setRows(generateIdentities(nextCount, asLocale(nextLocale)));
  };

  return (
    <VStack gap={4}>
      <Text color="secondary" display="block" textWrap="pretty">
        Generate disposable people for forms, screenshots and QA so you never type a real name, CPF
        or phone into a staging site. Documents use valid check digits but are random - not assigned
        to anyone.
      </Text>

      <HStack gap={4} wrap="wrap" vAlign="end">
        <SegmentedControl
          label="Locale"
          value={locale}
          onChange={(value: string) => {
            setLocale(value);
            regenerate(count, value);
          }}
        >
          <SegmentedControlItem value="br" label="Brazil" />
          <SegmentedControlItem value="us" label="United States" />
          <SegmentedControlItem value="intl" label="International" />
        </SegmentedControl>
        <Button label="Generate" variant="primary" onClick={() => regenerate()} />
        <CopyButton value={json} label="Copy JSON" />
        <CopyButton value={csv} label="Copy CSV" />
        <Button
          label="Download CSV"
          variant="secondary"
          onClick={() => downloadBlob(new Blob([csv], {type: 'text/csv'}), 'test-identities.csv')}
        />
      </HStack>

      <Slider
        label="How many identities"
        min={1}
        max={25}
        value={count}
        onChange={setCount}
        onChangeEnd={(value: number) => regenerate(value, locale)}
      />

      {rows.map(row => (
        <Card key={row.uuid} padding={4}>
          <VStack gap={2}>
            <HStack gap={2} wrap="wrap" vAlign="center">
              <Text weight="semibold" display="block">
                {row.fullName}
              </Text>
              <Token label={row.documentType} size="sm" />
              <CopyButton value={row.document} label={`Copy ${row.documentType}`} />
            </HStack>
            <Text type="supporting" display="block">
              {row.email} · {row.phone} · {row.dateOfBirth}
            </Text>
            <Text type="supporting" display="block">
              {row.address}, {row.city} {row.region} {row.postalCode}, {row.country}
            </Text>
            <Text type="code" display="block" wordBreak="break-all">
              {row.documentType} {row.document} · {row.username} · {row.uuid}
            </Text>
          </VStack>
        </Card>
      ))}

      <CodeBlock code={json} language="json" width="100%" maxHeight={280} isWrapped hasCopyButton={false} />

      <Text type="supporting" display="block" textWrap="pretty">
        These records are synthetic. Do not submit generated CPF/SSN values to government or
        financial systems. Emails use the reserved example.test domain.
      </Text>
    </VStack>
  );
}
