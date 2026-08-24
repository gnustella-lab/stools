import {useMemo, useState} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {TextArea} from '@astryxdesign/core/TextArea';
import {TextInput} from '@astryxdesign/core/TextInput';
import {SegmentedControl, SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';
import {FileInput} from '@astryxdesign/core/FileInput';
import {Button} from '@astryxdesign/core/Button';
import {Text} from '@astryxdesign/core/Text';
import {CodeBlock} from '@astryxdesign/core/CodeBlock';
import {Banner} from '@astryxdesign/core/Banner';
import {CopyButton} from '../components/CopyButton';
import {asFile, bytesToBlob, downloadBlob, formatBytes} from '../lib/files';
import {base64ToBytes, bytesToBase64} from '../lib/bytes';
import {decryptPayload, encryptPayload} from '../lib/crypto';

type Direction = 'encrypt' | 'decrypt';
type Source = 'text' | 'file';

export default function AesCrypt() {
  const [direction, setDirection] = useState<Direction>('encrypt');
  const [source, setSource] = useState<Source>('text');
  const [passphrase, setPassphrase] = useState('');
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const canRun = useMemo(() => {
    if (!passphrase) return false;
    if (source === 'text') return text.length > 0;
    return file !== null;
  }, [passphrase, source, text, file]);

  const run = async () => {
    setBusy(true);
    setError(null);
    setNote(null);
    setOutput('');
    try {
      if (source === 'text') {
        if (direction === 'encrypt') {
          const bytes = new TextEncoder().encode(text);
          const envelope = await encryptPayload(bytes, passphrase, 'text');
          setOutput(bytesToBase64(envelope));
          setNote(`Encrypted ${formatBytes(bytes.length)} of text into an AES-GCM envelope.`);
        } else {
          const envelope = base64ToBytes(text);
          const result = await decryptPayload(envelope, passphrase);
          setOutput(new TextDecoder().decode(result.bytes));
          setNote(`Decrypted ${formatBytes(result.bytes.length)} of plaintext.`);
        }
      } else if (file) {
        const input = new Uint8Array(await file.arrayBuffer());
        if (direction === 'encrypt') {
          const envelope = await encryptPayload(input, passphrase, file.name);
          const name = `${file.name}.stools`;
          downloadBlob(bytesToBlob(envelope), name);
          setNote(`Downloaded ${name} (${formatBytes(envelope.length)}). Keep the passphrase - it cannot be recovered.`);
        } else {
          const result = await decryptPayload(input, passphrase);
          const name = result.filename || file.name.replace(/\.stools$/i, '') || 'decrypted.bin';
          downloadBlob(bytesToBlob(result.bytes), name);
          setNote(`Downloaded ${name} (${formatBytes(result.bytes.length)}).`);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not complete the operation.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <VStack gap={4}>
      <HStack gap={4} wrap="wrap" vAlign="end">
        <SegmentedControl
          label="Direction"
          value={direction}
          onChange={v => {
            setDirection(v as Direction);
            setOutput('');
            setError(null);
            setNote(null);
          }}
        >
          <SegmentedControlItem value="encrypt" label="Encrypt" />
          <SegmentedControlItem value="decrypt" label="Decrypt" />
        </SegmentedControl>
        <SegmentedControl
          label="Input"
          value={source}
          onChange={v => {
            setSource(v as Source);
            setText('');
            setFile(null);
            setOutput('');
            setError(null);
            setNote(null);
          }}
        >
          <SegmentedControlItem value="text" label="Text" />
          <SegmentedControlItem value="file" label="File" />
        </SegmentedControl>
      </HStack>

      <TextInput
        label="Passphrase"
        type="password"
        value={passphrase}
        onChange={setPassphrase}
        placeholder="A long, unique passphrase"
        description="Used locally with PBKDF2 (210,000 iterations) to derive an AES-256-GCM key. Never stored."
        width="100%"
      />

      {source === 'text' ? (
        <TextArea
          label={direction === 'encrypt' ? 'Plain text' : 'sTools envelope (Base64)'}
          placeholder={
            direction === 'encrypt'
              ? 'Paste the secret you want to seal…'
              : 'Paste the Base64 envelope produced by Encrypt…'
          }
          value={text}
          onChange={setText}
          rows={7}
          hasSpellCheck={false}
        />
      ) : (
        <FileInput
          label={direction === 'encrypt' ? 'File to encrypt' : 'Encrypted .stools file'}
          description="The file is read into memory and never uploaded."
          accept={direction === 'decrypt' ? '.stools,application/octet-stream' : '*'}
          mode="dropzone"
          value={file}
          onChange={value => setFile(asFile(value))}
        />
      )}

      <HStack gap={3} wrap="wrap" vAlign="center">
        <Button
          label={direction === 'encrypt' ? 'Encrypt' : 'Decrypt'}
          variant="primary"
          onClick={() => void run()}
          isLoading={busy}
          isDisabled={!canRun}
        />
        {source === 'text' && <CopyButton value={output} />}
      </HStack>

      {error && (
        <Banner status="error" title="Operation failed" description={error} />
      )}
      {note && !error && (
        <Banner status="success" title="Done" description={note} />
      )}

      {output && (
        <VStack gap={2}>
          <Text weight="semibold" display="block">
            {direction === 'encrypt' ? 'Envelope (Base64)' : 'Plain text'}
          </Text>
          <CodeBlock
            code={output}
            language="plaintext"
            width="100%"
            maxHeight={320}
            isWrapped
            hasCopyButton={false}
          />
        </VStack>
      )}

      <Text type="supporting" display="block">
        Envelope format: STLS header, original filename, random salt, 12-byte IV
        and AES-GCM ciphertext. A wrong passphrase fails closed - there is no
        recovery.
      </Text>
    </VStack>
  );
}
