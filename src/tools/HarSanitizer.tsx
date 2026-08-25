import {useMemo, useState} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {TextArea} from '@astryxdesign/core/TextArea';
import {FileInput} from '@astryxdesign/core/FileInput';
import {Switch} from '@astryxdesign/core/Switch';
import {Button} from '@astryxdesign/core/Button';
import {Text} from '@astryxdesign/core/Text';
import {Banner} from '@astryxdesign/core/Banner';
import {Token} from '@astryxdesign/core/Token';
import {CodeBlock} from '@astryxdesign/core/CodeBlock';
import {CopyButton} from '../components/CopyButton';
import {asFile, downloadBlob, formatBytes} from '../lib/files';
import {DEFAULT_HAR_OPTIONS, sanitizeCapture, type HarSanitizeOptions} from '../lib/harSanitize';

const LABELS: {id: keyof HarSanitizeOptions; label: string; description: string}[] = [
  {
    id: 'cookies',
    label: 'Cookies',
    description: 'Cookie, Set-Cookie and the HAR cookies array.',
  },
  {
    id: 'authHeaders',
    label: 'Auth headers and API keys',
    description: 'Authorization, X-Api-Key, CSRF and similarly named headers.',
  },
  {
    id: 'querySecrets',
    label: 'Secret query parameters',
    description: 'token, access_token, api_key, session and related names.',
  },
  {
    id: 'bodies',
    label: 'Request and response bodies',
    description: 'JSON fields that look like secrets, JWTs, Bearer tokens and PEM keys.',
  },
  {
    id: 'ipAddresses',
    label: 'IP addresses',
    description: 'IPv4/IPv6 literals and HAR serverIPAddress.',
  },
];

export default function HarSanitizer() {
  const [input, setInput] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [options, setOptions] = useState<HarSanitizeOptions>(DEFAULT_HAR_OPTIONS);
  const [ioError, setIoError] = useState<string | null>(null);

  const parsed = useMemo(() => {
    if (!input.trim()) return {result: null, error: null};
    try {
      return {result: sanitizeCapture(input, options), error: null};
    } catch (e) {
      return {result: null, error: e instanceof Error ? e.message : 'Could not sanitize.'};
    }
  }, [input, options]);

  const result = parsed.result;
  const error = ioError ?? parsed.error;

  const loadFile = async (next: File | File[] | null) => {
    const picked = asFile(next);
    setFile(picked);
    setIoError(null);
    if (!picked) return;
    try {
      setInput(await picked.text());
    } catch (e) {
      setIoError(e instanceof Error ? e.message : 'Could not read file.');
    }
  };

  const download = () => {
    if (!result) return;
    const ext = result.format === 'text' ? 'txt' : 'json';
    const base = file?.name.replace(/\.[^.]+$/, '') ?? 'capture';
    downloadBlob(new Blob([result.output], {type: 'application/json'}), `${base}-sanitized.${ext}`);
  };

  return (
    <VStack gap={4}>
      <Text color="secondary" display="block" textWrap="pretty">
        Strip cookies, Authorization headers, tokens and IPs from a HAR file or JSON capture before
        you attach it to a ticket. Parsing and redaction stay in this tab.
      </Text>

      <FileInput
        label="HAR or JSON file (optional)"
        description="Read locally via FileReader - never uploaded."
        accept=".har,.json,.txt,application/json"
        mode="dropzone"
        value={file}
        onChange={v => void loadFile(v)}
      />

      <TextArea
        label="Paste HAR / JSON / log"
        placeholder='{"log":{"entries":[{"request":{"url":"https://api.example.com?access_token=secret","headers":[{"name":"Authorization","value":"Bearer abc"}]}}]}}'
        value={input}
        onChange={value => {
          setInput(value);
          setIoError(null);
          if (value) setFile(null);
        }}
        rows={10}
        hasSpellCheck={false}
      />

      <VStack gap={2}>
        <Text weight="semibold" display="block">
          Redact
        </Text>
        {LABELS.map(item => (
          <Switch
            key={item.id}
            label={item.label}
            description={item.description}
            value={options[item.id]}
            onChange={value => setOptions(prev => ({...prev, [item.id]: value}))}
          />
        ))}
      </VStack>

      {error && <Banner status="error" title="Could not sanitize" description={error} />}

      {result && (
        <VStack gap={3}>
          <HStack gap={2} wrap="wrap" vAlign="center">
            <Token label={result.format.toUpperCase()} size="sm" />
            <Token
              label={`${result.total} redaction${result.total === 1 ? '' : 's'}`}
              size="sm"
              color={result.total > 0 ? 'orange' : 'gray'}
            />
            {Object.entries(result.counts)
              .filter(([, count]) => count > 0)
              .map(([key, count]) => (
                <Token key={key} label={`${key}: ${count}`} size="sm" color="orange" />
              ))}
            <CopyButton value={result.output} />
            <Button label="Download" variant="secondary" onClick={download} />
          </HStack>
          <Text type="supporting" display="block">
            {formatBytes(new TextEncoder().encode(result.output).length)} sanitized output
          </Text>
          <CodeBlock
            code={result.output}
            language={result.format === 'text' ? 'plaintext' : 'json'}
            width="100%"
            maxHeight={420}
            isWrapped
            hasCopyButton={false}
          />
        </VStack>
      )}

      <Text type="supporting" display="block" textWrap="pretty">
        Redaction is name- and pattern-based. Unusual header names or secrets inside opaque binary
        bodies can slip through - skim the output before sharing.
      </Text>
    </VStack>
  );
}
