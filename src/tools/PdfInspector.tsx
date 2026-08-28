import { useCallback, useState } from 'react';
import { VStack, HStack } from '@astryxdesign/core/Layout';
import { FileInput } from '@astryxdesign/core/FileInput';
import { Text } from '@astryxdesign/core/Text';
import { Banner } from '@astryxdesign/core/Banner';
import { Token } from '@astryxdesign/core/Token';
import { CopyButton } from '../components/CopyButton';
import { asFile, downloadBlob, formatBytes } from '../lib/files';
import { inspectPdfBytes, stripPdfMetadata } from '../lib/pdfStrip';

export default function PdfInspector() {
  const [file, setFile] = useState<File | null>(null);
  const [info, setInfo] = useState<Record<string, string> | null>(null);
  const [meta, setMeta] = useState<{ hasXmp: boolean; hasInfo: boolean; pages: number | null; warnings: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cleaned, setCleaned] = useState<Blob | null>(null);
  const [removed, setRemoved] = useState<string[]>([]);

  const onFile = useCallback(async (v: File | File[] | null) => {
    const f = asFile(v);
    setFile(f);
    setInfo(null);
    setMeta(null);
    setError(null);
    setCleaned(null);
    setRemoved([]);
    if (!f) return;
    try {
      if (!f.type.includes('pdf') && !f.name.toLowerCase().endsWith('.pdf')) throw new Error('Select a PDF file.');
      if (f.size > 25 * 1024 * 1024) throw new Error('PDF too large (max 25 MB).');
      const bytes = new Uint8Array(await f.arrayBuffer());
      const inspected = inspectPdfBytes(bytes);
      setInfo(inspected.info);
      setMeta({ hasXmp: inspected.hasXmp, hasInfo: inspected.hasInfo, pages: inspected.pageCountHint, warnings: inspected.warnings });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const onClean = useCallback(async () => {
    if (!file) return;
    setError(null);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const { blob, removed } = stripPdfMetadata(bytes);
      setCleaned(blob);
      setRemoved(removed);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [file]);

  return (
    <VStack gap={4}>
      <Text type="supporting" display="block">
        Inspect and clean PDF metadata locally: Info dictionary (Author, Creator, Producer, dates) and XMP streams. Bytes are read with FileReader and rewritten in this tab — no upload.
      </Text>

      <FileInput label="PDF file" description="PDF up to 25 MB. Processed locally." accept=".pdf,application/pdf" value={file} onChange={onFile} />

      {error && <Banner status="error" title="Error" description={error} />}

      {meta && (
        <VStack gap={3}>
          <HStack gap={2} wrap="wrap">
            <Token label={meta.hasInfo ? 'Info: present' : 'Info: clean'} size="sm" color={meta.hasInfo ? 'orange' : 'green'} />
            <Token label={meta.hasXmp ? 'XMP: present' : 'XMP: none'} size="sm" color={meta.hasXmp ? 'orange' : 'green'} />
            {meta.pages && <Token label={`${meta.pages} page(s)`} size="sm" />}
            {file && <Text type="supporting" display="block">{formatBytes(file.size)} • {file.name}</Text>}
          </HStack>

          {info && Object.keys(info).length > 0 ? (
            <VStack gap={1}>
              <Text weight="semibold" display="block">Info dictionary</Text>
              {Object.entries(info).map(([k, v]) => (
                <HStack key={k} gap={2} wrap="wrap">
                  <Token label={k} size="sm" />
                  <Text type="code" display="block" wordBreak="break-all">{v || '—'}</Text>
                </HStack>
              ))}
            </VStack>
          ) : (
            <Text type="supporting" display="block">No Info entries found — already clean or uses object streams.</Text>
          )}

          {meta.warnings.map((w, i) => (
            <Banner key={i} status="warning" title="Note" description={w} />
          ))}

          <HStack gap={2}>
            <button onClick={() => void onClean()} style={{ padding: '8px 16px', borderRadius: 'var(--radius-control)', background: 'var(--color-background-accent)', color: 'white', border: 'none', cursor: 'pointer' }}>
              Remove metadata & download
            </button>
            {info && <CopyButton value={JSON.stringify(info, null, 2)} label="Copy Info JSON" />}
          </HStack>

          {cleaned && (
            <VStack gap={2}>
              <HStack gap={2} vAlign="center">
                <Token label={`Removed: ${removed.join(', ')}`} size="sm" color="green" />
                <Text type="supporting" display="block">{formatBytes(cleaned.size)} cleaned</Text>
                <button
                  onClick={() => downloadBlob(cleaned, file ? file.name.replace(/\.pdf$/i, '-clean.pdf') : 'clean.pdf')}
                  style={{ padding: '6px 12px', borderRadius: 'var(--radius-control)', border: '1px solid var(--color-border)', background: 'var(--color-background)', cursor: 'pointer' }}
                >
                  Download clean.pdf
                </button>
              </HStack>
              <Banner status="success" title="Cleaned" description="Info/XMP references removed. Xref offsets are kept as-is — most readers accept it, but verify with your PDF viewer before sharing." />
            </VStack>
          )}
        </VStack>
      )}
    </VStack>
  );
}
