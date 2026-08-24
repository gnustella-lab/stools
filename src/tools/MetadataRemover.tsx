import {useCallback, useState} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {FileInput} from '@astryxdesign/core/FileInput';
import {Text} from '@astryxdesign/core/Text';
import {Heading} from '@astryxdesign/core/Heading';
import {Banner} from '@astryxdesign/core/Banner';
import {Divider} from '@astryxdesign/core/Divider';
import {StatusDot} from '@astryxdesign/core/StatusDot';
import {MetadataList, MetadataListItem} from '@astryxdesign/core/MetadataList';
import {Button} from '@astryxdesign/core/Button';
import {Icon} from '@astryxdesign/core/Icon';
import {stripImageMetadata, strippedFilename} from '../lib/exif';
import {cleanFilename, stripVideoMetadata, type VideoStripResult} from '../lib/metastrip';
import {asFile, downloadBlob, formatBytes} from '../lib/files';

type MediaKind = 'image' | 'video' | null;

function detectKind(file: File): MediaKind {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'webp'].includes(ext ?? '')) return 'image';
  if (['mp4', 'm4v', 'mov', '3gp'].includes(ext ?? '')) return 'video';
  return null;
}

export default function MetadataRemover() {
  const [file, setFile] = useState<File | null>(null);
  const [kind, setKind] = useState<MediaKind>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const select = useCallback((value: File | File[] | null) => {
    const next = asFile(value);
    setFile(next);
    setKind(next ? detectKind(next) : null);
    setError(null);
    setNote(null);
  }, []);

  const clean = async () => {
    if (!file || !kind) return;
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      if (kind === 'image') {
        const blob = await stripImageMetadata(file);
        const name = strippedFilename(file.name, blob.type);
        downloadBlob(blob, name);
        setNote(
          `Downloaded ${name} (${formatBytes(blob.size)}, was ${formatBytes(file.size)}). EXIF, GPS and camera tags were dropped by re-encoding the pixels.`,
        );
      } else {
        const result: VideoStripResult = await stripVideoMetadata(file);
        const name = cleanFilename(file.name);
        downloadBlob(result.blob, name);
        const boxes = [...new Set(result.droppedBoxes)].join(', ');
        setNote(
          `Downloaded ${name} (${formatBytes(result.blob.size)}, was ${formatBytes(file.size)}). Removed ${formatBytes(result.droppedBytes)} of metadata (${boxes}).`,
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not strip metadata from this file.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <VStack gap={4}>
      <FileInput
        label="Image or video to clean"
        description="Images are re-encoded on a canvas; MP4/MOV videos have their metadata boxes removed byte-for-byte. The file never leaves your device."
        accept="image/*,video/mp4,video/x-m4v,video/quicktime,.mp4,.m4v,.mov,.3gp"
        mode="dropzone"
        value={file}
        onChange={select}
      />

      {file && kind === null && (
        <Banner
          status="error"
          title="Unsupported format"
          description="This tool handles images (JPEG, PNG, WebP) and ISO-BMFF video (MP4, M4V, MOV, 3GP)."
        />
      )}

      {file && kind !== null && (
        <>
          <HStack gap={3} wrap="wrap" vAlign="center">
            <Button
              label="Download clean copy"
              variant="primary"
              icon={<Icon icon="arrowDown" size="sm" />}
              onClick={() => void clean()}
              isLoading={busy}
            />
            <Text type="supporting" display="block">
              {kind === 'image'
                ? 'Re-encodes the pixels so EXIF, GPS and camera tags are not copied.'
                : 'Removes metadata boxes without re-encoding - original quality is preserved.'}
            </Text>
          </HStack>

          <VStack gap={2}>
            <Heading level={3}>File</Heading>
            <MetadataList>
              <MetadataListItem label="Name">{file.name}</MetadataListItem>
              <MetadataListItem label="Size">{formatBytes(file.size)}</MetadataListItem>
              <MetadataListItem label="Type">
                {kind === 'image' ? 'Image' : 'Video'}
                {file.type ? ` - ${file.type}` : ''}
              </MetadataListItem>
            </MetadataList>
            <HStack gap={2} vAlign="center">
              <StatusDot variant="neutral" label="Local processing only" />
              <Text type="supporting" display="block">
                Processed locally - no upload occurred.
              </Text>
            </HStack>
          </VStack>
        </>
      )}

      {error && (
        <Banner status="error" title="Could not remove metadata" description={error} />
      )}
      {note && (
        <Banner status="success" title="Clean copy downloaded" description={note} />
      )}

      {file && kind !== null && (
        <>
          <Divider />
          <Text type="supporting" display="block">
            For video, only container-level metadata is removed (tags, XMP and user data).
            Frames and audio are untouched. WebM/MKV files must be re-exported from an
            editor instead.
          </Text>
        </>
      )}
    </VStack>
  );
}
