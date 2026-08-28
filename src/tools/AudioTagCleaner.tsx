import { useCallback, useState } from 'react';
import { VStack, HStack } from '@astryxdesign/core/Layout';
import { FileInput } from '@astryxdesign/core/FileInput';
import { Text } from '@astryxdesign/core/Text';
import { Banner } from '@astryxdesign/core/Banner';
import { Token } from '@astryxdesign/core/Token';
import { asFile, downloadBlob, formatBytes } from '../lib/files';
import { inspectAudioFile, stripAudioFile } from '../lib/audioStrip';

interface Inspect { format: string; hasId3v2: boolean; hasId3v1: boolean; frames: string[]; warnings: string[] }

export default function AudioTagCleaner() {
  const [file, setFile] = useState<File | null>(null);
  const [inspect, setInspect] = useState<Inspect | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cleaned, setCleaned] = useState<{ blob: Blob; removed: string[] } | null>(null);

  const onFile = useCallback(async (v: File | File[] | null) => {
    const f = asFile(v);
    setFile(f);
    setInspect(null);
    setError(null);
    setCleaned(null);
    if (!f) return;
    try {
      if (f.size > 50 * 1024 * 1024) throw new Error('Audio too large (max 50 MB).');
      const r = await inspectAudioFile(f);
      setInspect(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const onStrip = useCallback(async () => {
    if (!file) return;
    setError(null);
    try {
      const r = await stripAudioFile(file);
      setCleaned(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [file]);

  return (
    <VStack gap={4}>
      <Text type="supporting" display="block">
        Inspect and strip ID3 tags from MP3 locally: TIT2/ TPE1/ APIC (cover art) and ID3v1 tail. Rewrites by slicing bytes — audio frames are untouched, no re-encoding.
      </Text>

      <FileInput label="Audio file" description="MP3 up to 50 MB. FLAC/MP4 use other cleaners." accept=".mp3,audio/*" value={file} onChange={onFile} />

      {error && <Banner status="error" title="Error" description={error} />}

      {inspect && file && (
        <VStack gap={3}>
          <HStack gap={2} wrap="wrap">
            <Token label={inspect.format} size="sm" />
            <Token label={inspect.hasId3v2 ? 'ID3v2: yes' : 'ID3v2: no'} size="sm" color={inspect.hasId3v2 ? 'orange' : 'green'} />
            <Token label={inspect.hasId3v1 ? 'ID3v1: yes' : 'ID3v1: no'} size="sm" color={inspect.hasId3v1 ? 'orange' : 'green'} />
            <Text type="supporting" display="block">{formatBytes(file.size)} • {file.name}</Text>
          </HStack>

          {inspect.frames.length > 0 && (
            <HStack gap={2} wrap="wrap">
              <Text type="label" display="block">Frames:</Text>
              {inspect.frames.map(f => (
                <Token key={f} label={f} size="sm" />
              ))}
            </HStack>
          )}

          {inspect.warnings.map((w, i) => (
            <Banner key={i} status={w.includes('cover') ? 'warning' : 'info'} title="Note" description={w} />
          ))}

          <button onClick={() => void onStrip()} style={{ padding: '8px 16px', borderRadius: 'var(--radius-control)', background: 'var(--color-background-accent)', color: 'white', border: 'none', cursor: 'pointer' }}>
            Strip ID3 & download
          </button>

          {cleaned && (
            <VStack gap={2}>
              <HStack gap={2} vAlign="center">
                <Token label={`Removed ${cleaned.removed.join(', ')}`} size="sm" color="green" />
                <Text type="supporting" display="block">{formatBytes(cleaned.blob.size)} cleaned</Text>
                <button onClick={() => downloadBlob(cleaned.blob, file.name.replace(/\.mp3$/i, '-clean.mp3'))} style={{ padding: '6px 12px', borderRadius: 'var(--radius-control)', border: '1px solid var(--color-border)', background: 'var(--color-background)', cursor: 'pointer' }}>Download clean.mp3</button>
              </HStack>
              <Banner status="success" title="Stripped" description="ID3 bytes removed. For MP4/M4A/MOV (ISO-BMFF) use Metadata Remover; for FLAC/OGG Vorbis comments need re-encoding." />
            </VStack>
          )}
        </VStack>
      )}
    </VStack>
  );
}
