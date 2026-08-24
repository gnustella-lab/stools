import {useCallback, useEffect, useState} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {TextArea} from '@astryxdesign/core/TextArea';
import {FileInput} from '@astryxdesign/core/FileInput';
import {SegmentedControl, SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';
import {Text} from '@astryxdesign/core/Text';
import {CopyButton} from '../components/CopyButton';
import {asFile} from '../lib/files';

const ALGORITHMS = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'] as const;
type Algorithm = (typeof ALGORITHMS)[number];

async function digestAll(data: ArrayBuffer): Promise<Record<Algorithm, string>> {
  const results = {} as Record<Algorithm, string>;
  for (const algo of ALGORITHMS) {
    const buf = await crypto.subtle.digest(algo, data);
    results[algo] = [...new Uint8Array(buf)]
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
  return results;
}

function DigestRow({algorithm, value}: {algorithm: Algorithm; value: string}) {
  if (!value) {
    return (
      <VStack gap={1}>
        <Text weight="semibold" display="block">
          {algorithm}
        </Text>
        <Text type="supporting" display="block">
          Waiting for input…
        </Text>
      </VStack>
    );
  }
  return (
    <VStack gap={1}>
      <HStack gap={3} vAlign="center">
        <Text weight="semibold" display="block">
          {algorithm}
        </Text>
        <CopyButton value={value} label="Copy hash" />
      </HStack>
      <Text type="code" display="block" wordBreak="break-all">
        {value}
      </Text>
    </VStack>
  );
}

export default function HashCalculator() {
  const [mode, setMode] = useState('text');
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [hashes, setHashes] = useState<Record<Algorithm, string> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const computeFromBlob = useCallback(async (blob: Blob) => {
    try {
      const buffer = await blob.arrayBuffer();
      setHashes(await digestAll(buffer));
      setError(null);
    } catch {
      setError('Could not read the input data.');
    }
  }, []);

  useEffect(() => {
    if (mode !== 'text') return;
    const bytes = new TextEncoder().encode(text);
    if (bytes.length === 0) {
      setHashes(null);
      return;
    }
    let cancelled = false;
    digestAll(bytes.buffer).then(result => {
      if (!cancelled) setHashes(result);
    });
    return () => {
      cancelled = true;
    };
  }, [text, mode]);

  useEffect(() => {
    if (mode !== 'file') return;
    if (!file) {
      setHashes(null);
      return;
    }
    void computeFromBlob(file);
  }, [file, mode, computeFromBlob]);

  return (
    <VStack gap={4}>
      <HStack gap={4} wrap="wrap">
        <SegmentedControl
          label="Input source"
          value={mode}
          onChange={value => {
            setMode(value);
            setText('');
            setFile(null);
            setHashes(null);
            setError(null);
          }}
        >
          <SegmentedControlItem value="text" label="Text" />
          <SegmentedControlItem value="file" label="File" />
        </SegmentedControl>
      </HStack>

      {mode === 'text' ? (
        <TextArea
          label="Text to hash"
          placeholder="Type or paste text - digests update as you type"
          value={text}
          onChange={setText}
          rows={6}
          hasSpellCheck={false}
        />
      ) : (
        <FileInput
          label="File to hash"
          description="The file is read in memory only. It is never uploaded."
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

      {hashes && (
        <VStack gap={3}>
          {ALGORITHMS.map(algo => (
            <DigestRow key={algo} algorithm={algo} value={hashes[algo]} />
          ))}
        </VStack>
      )}
    </VStack>
  );
}
