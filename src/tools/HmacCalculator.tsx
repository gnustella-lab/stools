import {useEffect, useState} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {TextArea} from '@astryxdesign/core/TextArea';
import {TextInput} from '@astryxdesign/core/TextInput';
import {SegmentedControl, SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';
import {FileInput} from '@astryxdesign/core/FileInput';
import {Text} from '@astryxdesign/core/Text';
import {CopyButton} from '../components/CopyButton';
import {asFile} from '../lib/files';
import {hmacHex, type HmacAlgorithm} from '../lib/crypto';

const ALGORITHMS: HmacAlgorithm[] = ['SHA-256', 'SHA-384', 'SHA-512'];

export default function HmacCalculator() {
  const [algorithm, setAlgorithm] = useState<HmacAlgorithm>('SHA-256');
  const [secret, setSecret] = useState('');
  const [mode, setMode] = useState('text');
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [digest, setDigest] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!secret) {
        setDigest('');
        setError(null);
        return;
      }
      try {
        let message: Uint8Array;
        if (mode === 'text') {
          message = new TextEncoder().encode(text);
        } else if (file) {
          message = new Uint8Array(await file.arrayBuffer());
        } else {
          setDigest('');
          setError(null);
          return;
        }
        const hex = await hmacHex(algorithm, secret, message);
        if (!cancelled) {
          setDigest(hex);
          setError(null);
        }
      } catch {
        if (!cancelled) {
          setDigest('');
          setError('Could not compute HMAC for this input.');
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [algorithm, secret, mode, text, file]);

  return (
    <VStack gap={4}>
      <HStack gap={4} wrap="wrap" vAlign="end">
        <SegmentedControl
          label="Hash"
          value={algorithm}
          onChange={v => setAlgorithm(v as HmacAlgorithm)}
        >
          {ALGORITHMS.map(algo => (
            <SegmentedControlItem key={algo} value={algo} label={algo} />
          ))}
        </SegmentedControl>
        <SegmentedControl
          label="Message source"
          value={mode}
          onChange={v => {
            setMode(v);
            setText('');
            setFile(null);
            setDigest('');
          }}
        >
          <SegmentedControlItem value="text" label="Text" />
          <SegmentedControlItem value="file" label="File" />
        </SegmentedControl>
      </HStack>

      <TextInput
        label="Secret key"
        type="password"
        value={secret}
        onChange={setSecret}
        placeholder="HMAC key"
        description="Imported as raw bytes (UTF-8) and used only in this tab."
        width="100%"
      />

      {mode === 'text' ? (
        <TextArea
          label="Message"
          placeholder="Message to authenticate…"
          value={text}
          onChange={setText}
          rows={6}
          hasSpellCheck={false}
        />
      ) : (
        <FileInput
          label="Message file"
          description="Hashed locally with HMAC. Never uploaded."
          accept="*"
          value={file}
          onChange={value => setFile(asFile(value))}
        />
      )}

      {error && (
        <Text color="accent" display="block">
          {error}
        </Text>
      )}

      {digest && (
        <VStack gap={1}>
          <HStack gap={3} vAlign="center">
            <Text weight="semibold" display="block">
              HMAC-{algorithm}
            </Text>
            <CopyButton value={digest} label="Copy digest" />
          </HStack>
          <Text type="code" display="block" wordBreak="break-all">
            {digest}
          </Text>
        </VStack>
      )}
    </VStack>
  );
}
