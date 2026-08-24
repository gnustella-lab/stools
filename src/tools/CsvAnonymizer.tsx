import {useEffect, useMemo, useState} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {TextArea} from '@astryxdesign/core/TextArea';
import {TextInput} from '@astryxdesign/core/TextInput';
import {FileInput} from '@astryxdesign/core/FileInput';
import {Selector} from '@astryxdesign/core/Selector';
import {Button} from '@astryxdesign/core/Button';
import {Text} from '@astryxdesign/core/Text';
import {Banner} from '@astryxdesign/core/Banner';
import {CodeBlock} from '@astryxdesign/core/CodeBlock';
import {Card} from '@astryxdesign/core/Card';
import {Divider} from '@astryxdesign/core/Divider';
import {CopyButton} from '../components/CopyButton';
import {asFile, downloadBlob, formatBytes} from '../lib/files';
import {anonymizeCsv, anonymizeJson, inferStrategies, parseCsv, type AnonymizeConfig, type ColumnStrategy} from '../lib/anonymize';
import {secureRandomBytes} from '../lib/random';
import {bytesToHex} from '../lib/bytes';

const STRATEGY_OPTIONS: {value: ColumnStrategy; label: string}[] = [
  {value: 'keep', label: 'Keep'},
  {value: 'pseudonymize', label: 'Pseudonymize (deterministic)'},
  {value: 'mask', label: 'Mask'},
  {value: 'hash', label: 'Hash (SHA-like)'},
  {value: 'randomize', label: 'Randomize'},
  {value: 'remove', label: 'Remove column'},
];

function generateSalt(): string {
  return bytesToHex(secureRandomBytes(8));
}

export default function CsvAnonymizer() {
  const [inputText, setInputText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<'auto' | 'csv' | 'json'>('auto');
  const [salt, setSalt] = useState(() => generateSalt());
  const [config, setConfig] = useState<AnonymizeConfig>({});
  const [headers, setHeaders] = useState<string[]>([]);
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const effectiveText = useMemo(() => inputText, [inputText]);

  const detectMode = (text: string): 'csv' | 'json' => {
    if (mode !== 'auto') return mode;
    const trimmed = text.trim();
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        JSON.parse(trimmed);
        return 'json';
      } catch {
        return 'csv';
      }
    }
    return 'csv';
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setError(null);
      setNote(null);
      let text = effectiveText;
      if (file) {
        try {
          text = await file.text();
          if (cancelled) return;
          setInputText(text);
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Could not read file.');
          return;
        }
      }
      if (!text.trim()) {
        setHeaders([]);
        setConfig({});
        setOutput('');
        return;
      }
      try {
        const m = detectMode(text);
        let hdrs: string[] = [];
        if (m === 'csv') {
          const parsed = parseCsv(text);
          hdrs = parsed.headers;
        } else {
          const parsed: unknown = JSON.parse(text.trim());
          const arr = Array.isArray(parsed) ? parsed : [parsed];
          if (arr.length > 0 && typeof arr[0] === 'object' && arr[0] !== null) {
            hdrs = Object.keys(arr[0] as Record<string, unknown>);
          }
        }
        if (!cancelled) {
          setHeaders(hdrs);
          if (hdrs.length > 0) {
            const inferred = inferStrategies(hdrs);
            setConfig(prev => {
              if (Object.keys(prev).length === 0) return inferred;
              const next: AnonymizeConfig = {...inferred};
              for (const h of hdrs) if (prev[h]) next[h] = prev[h];
              return next;
            });
          }
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not parse input.');
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [file, effectiveText, mode]);

  const run = async () => {
    setBusy(true);
    setError(null);
    setNote(null);
    setOutput('');
    try {
      let text = effectiveText;
      if (file) text = await file.text();
      if (!text.trim()) throw new Error('Paste CSV/JSON or select a file.');
      const m = detectMode(text);
      const result = m === 'csv' ? anonymizeCsv(text, config, {salt}) : anonymizeJson(text, config, {salt});
      setOutput(result);
      const size = new TextEncoder().encode(result).length;
      setNote(
        `Anonymized ${m.toUpperCase()} - ${headers.length} columns, ${formatBytes(size)} output. Salt ${salt.slice(0, 8)}… kept in memory only - same salt = same pseudonyms for joins.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not anonymize.');
    } finally {
      setBusy(false);
    }
  };

  const download = () => {
    if (!output) return;
    const m = detectMode(effectiveText || (file ? file.name : ''));
    const ext = m === 'json' ? 'json' : 'csv';
    const mime = m === 'json' ? 'application/json' : 'text/csv';
    const blob = new Blob([output], {type: mime});
    const base = file?.name?.replace(/\.[^.]+$/, '') ?? 'dataset';
    downloadBlob(blob, `${base}-anonymized.${ext}`);
  };

  return (
    <VStack gap={4}>
      <Text color="secondary" display="block" textWrap="pretty">
        Drop a CSV or JSON file (or paste it) and choose how to handle each column. Pseudonymize keeps joins
        consistent with a salt you control; everything runs in this tab and the mapping is discarded when you close it.
      </Text>

      <HStack gap={3} wrap="wrap" vAlign="end">
        <Selector
          label="Format"
          value={mode}
          onChange={v => setMode(v as 'auto' | 'csv' | 'json')}
          options={[
            {value: 'auto', label: 'Auto-detect'},
            {value: 'csv', label: 'CSV'},
            {value: 'json', label: 'JSON'},
          ]}
        />
        <TextInput
          label="Pseudonym salt (hex)"
          value={salt}
          onChange={setSalt}
          placeholder="random hex salt"
          description="Same salt → same pseudonyms. Change it to break linkability. Stored only in memory."
          width="320px"
        />
        <Button label="New salt" variant="secondary" onClick={() => setSalt(generateSalt())} />
      </HStack>

      <FileInput
        label="CSV / JSON file (optional)"
        description="Read locally via FileReader - never uploaded. Paste below if you prefer."
        accept=".csv,.json,.txt,application/json,text/csv"
        mode="dropzone"
        value={file}
        onChange={v => {
          setFile(asFile(v));
          if (asFile(v)) setInputText('');
        }}
      />

      <TextArea
        label="Paste CSV or JSON"
        placeholder={'name,email,phone\nAlice,alice@example.com,+55 11 99999-0000\nBob,bob@example.com,+55 21 98888-1111\n\n- or -\n[{"name":"Alice","email":"alice@example.com"}]'}
        value={inputText}
        onChange={v => {
          setInputText(v);
          if (v) setFile(null);
        }}
        rows={8}
        hasSpellCheck={false}
      />

      {headers.length > 0 && (
        <Card padding={4} variant="muted">
          <VStack gap={3}>
            <Text weight="semibold" display="block">
              Columns - choose a strategy per field
            </Text>
            <Text type="supporting" display="block">
              Pseudonymize is deterministic with the salt (same email → same token, good for joins). Mask keeps shape.
              Hash is irreversible. Remove drops the column.
            </Text>
            {headers.map(h => (
              <HStack key={h} gap={3} vAlign="center" wrap="wrap">
                <Text weight="medium" display="block" style={{minWidth: 140}}>
                  {h}
                </Text>
                <Selector
                  label={`Strategy for ${h}`}
                  value={config[h] ?? 'keep'}
                  onChange={v => setConfig(prev => ({...prev, [h]: v as ColumnStrategy}))}
                  options={STRATEGY_OPTIONS}
                />
              </HStack>
            ))}
          </VStack>
        </Card>
      )}

      <HStack gap={3} wrap="wrap" vAlign="center">
        <Button label="Anonymize" variant="primary" onClick={() => void run()} isLoading={busy} isDisabled={!inputText && !file} />
        {output && <Button label="Download" variant="secondary" onClick={download} />}
        {output && <CopyButton value={output} />}
      </HStack>

      {error && <Banner status="error" title="Could not anonymize" description={error} />}
      {note && !error && <Banner status="success" title="Done" description={note} />}

      {output && (
        <VStack gap={2}>
          <Text weight="semibold" display="block">
            Output preview
          </Text>
          <CodeBlock code={output} language={detectMode(effectiveText) === 'json' ? 'json' : 'plaintext'} width="100%" maxHeight={420} isWrapped hasCopyButton={false} />
        </VStack>
      )}

      <Divider />

      <VStack gap={2}>
        <Text weight="semibold" display="block">
          Privacy notes
        </Text>
        <Text type="supporting" display="block" textWrap="pretty">
          No mapping leaves the browser. Pseudonyms are derived with a fast non-cryptographic hash + salt for
          demo/utility use - for high-risk datasets use a stronger KDF and audit re-identification risk (k-anonymity).
          Review the output before sharing.
        </Text>
      </VStack>
    </VStack>
  );
}
