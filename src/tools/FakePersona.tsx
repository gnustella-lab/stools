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
import {generatePersona, type Persona, type PersonaLocale} from '../lib/persona';
import {bytesToBlob, downloadBlob} from '../lib/files';

type ExportFormat = 'json' | 'csv';

const LOCALE_OPTIONS: {value: PersonaLocale; label: string}[] = [
  {value: 'BR', label: 'Brazil — CPF/CNPJ, +55'},
  {value: 'US', label: 'United States — SSN, +1'},
  {value: 'EU', label: 'Europe — IBAN/Passport, +33/+49 etc.'},
];

export default function FakePersona() {
  const [locale, setLocale] = useState<PersonaLocale>('BR');
  const [count, setCount] = useState(1);
  const [format, setFormat] = useState<ExportFormat>('json');
  const [includeDocs, setIncludeDocs] = useState(true);
  const [includeCard, setIncludeCard] = useState(true);
  const [personas, setPersonas] = useState<Persona[]>(() => [generatePersona('BR')]);

  const regenerate = (n: number, loc: PersonaLocale = locale) => {
    const next: Persona[] = [];
    for (let i = 0; i < n; i++) next.push(generatePersona(loc));
    setPersonas(next);
  };

  const handleLocaleChange = (v: PersonaLocale) => {
    setLocale(v);
    regenerate(count, v);
  };

  const output = useMemo(() => {
    const filtered = personas.map(p => {
      const copy = {...p} as Record<string, unknown>;
      if (!includeDocs) {
        delete copy.cpf;
        delete copy.cnpj;
        delete copy.ssn;
        delete copy.passport;
        delete copy.iban;
        delete copy.nationalId;
        delete copy.vatId;
      } else {
        // hide irrelevant placeholders per locale to keep output clean
        if (p.locale === 'BR') {
          delete copy.ssn;
          delete copy.vatId;
        } else if (p.locale === 'US') {
          delete copy.cpf;
          delete copy.cnpj;
          delete copy.vatId;
        } else {
          delete copy.cpf;
          delete copy.cnpj;
          delete copy.ssn;
        }
      }
      if (!includeCard) {
        delete copy.creditCard;
        delete copy.creditExpiry;
        delete copy.creditCvv;
      }
      return copy;
    });
    if (format === 'csv') {
      // personasToCsv expects Persona[], cast after filtering
      const headers = Object.keys(filtered[0] ?? {});
      if (headers.length === 0) return '';
      const escape = (v: string) => (v.includes(',') || v.includes('"') || v.includes('\n') ? `"${v.replaceAll('"', '""')}"` : v);
      const lines = [headers.join(',')];
      for (const row of filtered) lines.push(headers.map(h => escape(String((row as Record<string, unknown>)[h] ?? ''))).join(','));
      return lines.join('\n');
    }
    return JSON.stringify(filtered.length === 1 ? filtered[0] : filtered, null, 2);
  }, [personas, format, includeDocs, includeCard]);

  const download = () => {
    const blob = bytesToBlob(new TextEncoder().encode(output), format === 'csv' ? 'text/csv' : 'application/json');
    downloadBlob(blob, `personas-${locale.toLowerCase()}-${personas.length}.${format}`);
  };

  const docLabel =
    locale === 'BR' ? 'CPF/CNPJ valid' : locale === 'US' ? 'SSN valid' : 'IBAN mod-97 valid';

  return (
    <VStack gap={4}>
      <Text color="secondary" display="block" textWrap="pretty">
        Generate fake but structurally valid identities per locale for signups, screenshots and test fixtures — without
        exposing real PII. CPF/CNPJ (BR), SSN (US) and IBAN (EU) pass checksum/Luhn/mod-97, all derived from{' '}
        <Text type="code">crypto.getRandomValues</Text> entirely in this tab.
      </Text>

      <HStack gap={3} wrap="wrap" vAlign="end">
        <Selector
          label="Locale"
          value={locale}
          onChange={v => handleLocaleChange(v as PersonaLocale)}
          options={LOCALE_OPTIONS}
        />
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
        <Switch
          label={locale === 'BR' ? 'Include CPF / CNPJ' : locale === 'US' ? 'Include SSN / Passport' : 'Include IBAN / National ID'}
          value={includeDocs}
          onChange={setIncludeDocs}
        />
        <Switch label="Include fake card" description="Luhn-valid test numbers only — not chargeable" value={includeCard} onChange={setIncludeCard} />
      </HStack>

      <HStack gap={2} wrap="wrap">
        <Token label={`${personas.length} persona${personas.length === 1 ? '' : 's'} · ${locale}`} size="sm" />
        <Token label={docLabel} size="sm" color="green" />
        <Token label="Luhn valid" size="sm" color="green" />
        <Token label="100% local" size="sm" />
      </HStack>

      <CodeBlock code={output} language={format === 'json' ? 'json' : 'plaintext'} width="100%" maxHeight={520} hasLineNumbers={format === 'json'} isWrapped hasCopyButton={false} />

      <VStack gap={2}>
        {personas.slice(0, 1).map(p => (
          <HStack key={p.email} gap={2} wrap="wrap">
            <Text type="supporting" display="block">
              Example ({p.locale}/{p.country}): {p.fullName} · {p.email} · {p.phone} · {p.city}/{p.state} ·{' '}
              {p.locale === 'BR' ? p.cpf : p.locale === 'US' ? p.ssn : `${p.iban} · ${p.passport}`}
            </Text>
          </HStack>
        ))}
      </VStack>

      <Banner
        status="info"
        title="Use responsibly"
        description="These identities are synthetic and must not be used to impersonate real people or to bypass KYC/identity verification where prohibited. Cards and IBANs are test numbers and will be declined; SSN/CPF are randomly generated with valid checksum but not assigned."
      />

      <Text type="supporting" display="block" textWrap="pretty">
        All randomness comes from the operating system via Web Crypto. Nothing is sent to a server; close the tab and
        the personas are gone. Switch locale to match the form you’re testing — BR for CPF/CNPJ, US for SSN/EIN, EU for
        IBAN/passport.
      </Text>
    </VStack>
  );
}
