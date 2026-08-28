import { useCallback, useState } from 'react';
import { VStack, HStack } from '@astryxdesign/core/Layout';
import { FileInput } from '@astryxdesign/core/FileInput';
import { Text } from '@astryxdesign/core/Text';
import { Banner } from '@astryxdesign/core/Banner';
import { Token } from '@astryxdesign/core/Token';
import { asFile, formatBytes } from '../lib/files';
import { detectFileMagic, type MagicResult } from '../lib/magic';

export default function FileMagicInspector() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<MagicResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const inspect = useCallback(async (f: File) => {
    setError(null);
    try {
      const r = await detectFileMagic(f);
      setResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setResult(null);
    }
  }, []);

  const onFile = (v: File | File[] | null) => {
    const f = asFile(v);
    setFile(f);
    if (f) void inspect(f);
    else setResult(null);
  };

  return (
    <VStack gap={4}>
      <Text type="supporting" display="block">
        Check a file's real type from its magic bytes vs its extension. Catches spoofed double extensions (e.g., invoice.pdf.exe) and warns before you open it — all offline via DataView.
      </Text>

      <FileInput label="File to inspect" description="Any file — read first 32 bytes only, in memory." accept="*" value={file} onChange={onFile} />

      {error && <Banner status="error" title="Error" description={error} />}

      {result && file && (
        <VStack gap={3}>
          <HStack gap={2} wrap="wrap" vAlign="center">
            <Token label={result.detectedMime} size="sm" color="orange" />
            <Text type="supporting" display="block">ext: .{result.declaredExt || '—'} → expected {result.detectedExts.join(', ') || '—'}</Text>
            {result.mismatch ? <Token label="MISMATCH" size="sm" color="red" /> : <Token label="Match" size="sm" color="green" />}
            <Token label={result.confidence} size="sm" />
          </HStack>

          <Text weight="semibold" display="block">{result.description}</Text>
          <Text type="supporting" display="block">Size: {formatBytes(file.size)} • Name: {file.name}</Text>
          <Text type="code" display="block" wordBreak="break-all">First bytes: {result.bytesHex}</Text>

          {result.mismatch && (
            <Banner status="error" title="Extension mismatch" description={`File declares .${result.declaredExt} but magic says ${result.detectedMime} (${result.detectedExts.join(', ')}). This is a common phishing trick (double extension). Do not open until verified.`} />
          )}

          {result.isText && <Banner status="info" title="Likely text" description="No binary magic — file looks like plain text/JSON/CSV. Check content with a local viewer, not by executing." />}
          {!result.isText && result.confidence === 'low' && <Banner status="warning" title="Unknown binary" description="No signature matched — treat as unknown and open only in a sandbox." />}
        </VStack>
      )}

      <Text type="supporting" display="block">Heuristic table covers PNG, JPEG, GIF, WebP, BMP, TIFF, PDF, ZIP/Office, GZIP, MP4/MOV, MP3, FLAC, OGG, WebM, WASM. No upload.</Text>
    </VStack>
  );
}
