import {useMemo, useState} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Text} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import {Slider} from '@astryxdesign/core/Slider';
import {Switch} from '@astryxdesign/core/Switch';
import {Selector} from '@astryxdesign/core/Selector';
import {CodeBlock} from '@astryxdesign/core/CodeBlock';
import {Banner} from '@astryxdesign/core/Banner';
import {Token} from '@astryxdesign/core/Token';
import {CopyButton} from '../components/CopyButton';
import {generatePersona, personasToCsv, type Persona} from '../lib/persona';
import {bytesToBlob, downloadBlob} from '../lib/files';

type ExportFormat = 'json' | 'csv';

export default function FakePersona() {
  const [count, setCount] = useState(1);
  const [format, setFormat] = useState<ExportFormat>('json');
  const [includeCpf, setIncludeCpf] = useState(true);
  const [includeCard, setIncludeCard] = useState(true);
  const [personas, setPersonas] = useState<Persona[]>(() => [generatePersona()]);

  const regenerate = (n: number) => {
    const next: Persona[] = [];
    for (let i = 0; i < n; i++) next.push(generatePersona());
    setPersonas(next);
  };

  const output = useMemo(() => {
    const filtered = personas.map(p => {
      const copy = {...p};
      if (!includeCpf) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const {cpf, cnpj, ...rest} = copy as Persona & {cnpj: string};
        return rest as unknown as Persona;
      }
      if (!includeCard) {
        const {creditCard, creditExpiry, creditCvv, ...rest} = copy as Persona;
        return rest as unknown as Persona;
      }
      return copy;
    });
    if (format === 'csv') return personasToCsv(filtered as Persona[]);
    return JSON.stringify(filtered.length === 1 ? filtered[0] : filtered, null, 2);
  }, [personas, format, includeCpf, includeCard]);

  const download = () => {
    const blob = bytesToBlob(new TextEncoder().encode(output), format === 'csv' ? 'text/csv' : 'application/json');
    downloadBlob(blob, `personas-${personas.length}.${format}`);
  };

  return (
    <VStack gap={4}>
      <Text color="secondary" display="block" textWrap="pretty">
        Generate fake but structurally valid identities for signups, screenshots and test fixtures — without exposing
        real PII. CPF/CNPJ pass checksum, cards pass Luhn, all derived from <Text type="code">crypto.getRandomValues</Text>{' '}
        entirely in this tab.
      </Text>

      <HStack gap={3} wrap="wrap" vAlign="end">
        <Slider label="Count" min={1} max={50} value={count} onChange={setCount} onChangeEnd={(v: number) => regenerate(v)} />
        <Selector
          label="Export format"
          value={format}
          onChange={v => setFormat(v as ExportFormat)}
          options={[
            {value: 'json', label: 'JSON'},
            {value: 'csv', label: 'CSV'},
          ]}
        />
        <Button label="Regenerate" variant="primary" onClick={() => regenerate(count)} />
        <Button label="Download" variant="secondary" onClick={download} />
        <CopyButton value={output} />
      </HStack>

      <HStack gap={3} wrap="wrap">
        <Switch label="Include CPF / CNPJ" value={includeCpf} onChange={setIncludeCpf} />
        <Switch label="Include fake card" description="Luhn-valid test numbers only — not chargeable" value={includeCard} onChange={setIncludeCard} />
      </HStack>

      <HStack gap={2} wrap="wrap">
        <Token label={`${personas.length} persona${personas.length === 1 ? '' : 's'}`} size="sm" />
        <Token label="CPF checksum valid" size="sm" color="green" />
        <Token label="Luhn valid" size="sm" color="green" />
        <Token label="100% local" size="sm" />
      </HStack>

      <CodeBlock code={output} language={format === 'json' ? 'json' : 'plaintext'} width="100%" maxHeight={520} hasLineNumbers={format === 'json'} isWrapped hasCopyButton={false} />

      <VStack gap={2}>
        {personas.slice(0, 1).map(p => (
          <HStack key={p.email} gap={2} wrap="wrap">
            <Text type="supporting" display="block">
              Example: {p.fullName} · {p.email} · {p.phone} · {p.city}/{p.state} · {p.cpf}
            </Text>
          </HStack>
        ))}
      </VStack>

      <Banner
        status="info"
        title="Use responsibly"
        description="These identities are synthetic and must not be used to impersonate real people or to bypass identity verification where prohibited. Cards are test numbers and will be declined."
      />

      <Text type="supporting" display="block" textWrap="pretty">
        All randomness comes from the operating system via Web Crypto. Nothing is sent to a server; close the tab and
        the personas are gone. Re-generate as needed.
      </Text>
    </VStack>
  );
}
