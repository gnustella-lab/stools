import {useCallback, useState} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {FileInput} from '@astryxdesign/core/FileInput';
import {Text} from '@astryxdesign/core/Text';
import {Heading} from '@astryxdesign/core/Heading';
import {Banner} from '@astryxdesign/core/Banner';
import {Divider} from '@astryxdesign/core/Divider';
import {StatusDot} from '@astryxdesign/core/StatusDot';
import {MetadataList, MetadataListItem} from '@astryxdesign/core/MetadataList';
import {Link} from '@astryxdesign/core/Link';
import {Button} from '@astryxdesign/core/Button';
import {Icon} from '@astryxdesign/core/Icon';
import {
  parseExif,
  stripImageMetadata,
  strippedFilename,
  type ExifEntry,
} from '../lib/exif';
import {asFile, downloadBlob, formatBytes} from '../lib/files';

const SENSITIVE_HINTS = ['GPS', 'Coordinates', 'Map link', 'serial', 'owner'];

export default function ImageMetadataInspector() {
  const [file, setFile] = useState<File | null>(null);
  const [entries, setEntries] = useState<ExifEntry[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [stripError, setStripError] = useState<string | null>(null);
  const [stripping, setStripping] = useState(false);
  const [strippedNote, setStrippedNote] = useState<string | null>(null);

  const inspect = useCallback((value: File | File[] | null) => {
    const next = asFile(value);
    setFile(next);
    setEntries(null);
    setParseError(null);
    setStripError(null);
    setStrippedNote(null);
    if (!next) return;
    void next.arrayBuffer().then(buffer => {
      try {
        setEntries(parseExif(buffer));
      } catch (e) {
        setParseError(e instanceof Error ? e.message : 'Could not parse this image.');
        setEntries([]);
      }
    });
  }, []);

  const strip = async () => {
    if (!file) return;
    setStripping(true);
    setStripError(null);
    setStrippedNote(null);
    try {
      const blob = await stripImageMetadata(file);
      const name = strippedFilename(file.name, blob.type);
      downloadBlob(blob, name);
      setStrippedNote(
        `Downloaded ${name} (${formatBytes(blob.size)}). EXIF, GPS and other metadata were dropped by re-encoding the pixels.`,
      );
    } catch (e) {
      setStripError(e instanceof Error ? e.message : 'Could not strip metadata from this image.');
    } finally {
      setStripping(false);
    }
  };

  const sensitive = entries?.filter(e =>
    SENSITIVE_HINTS.some(hint => e.name.toLowerCase().includes(hint.toLowerCase())),
  );
  const hasGps = (sensitive?.length ?? 0) > 0;
  const groups = [...new Set(entries?.map(e => e.group) ?? [])];

  return (
    <VStack gap={4}>
      <FileInput
        label="Image to inspect"
        description="JPEG files expose full EXIF. PNG and WebP can still be stripped via re-encode. The file never leaves your device."
        accept="image/*"
        mode="dropzone"
        value={file}
        onChange={inspect}
      />

      {file && (
        <HStack gap={3} wrap="wrap" vAlign="center">
          <Button
            label="Download without metadata"
            variant="primary"
            icon={<Icon icon="arrowDown" size="sm" />}
            onClick={() => void strip()}
            isLoading={stripping}
          />
          <Text type="supporting" display="block">
            Re-encodes pixels on a canvas so EXIF, GPS and camera tags are not copied.
          </Text>
        </HStack>
      )}

      {stripError && (
        <Banner status="error" title="Could not strip metadata" description={stripError} />
      )}
      {strippedNote && (
        <Banner status="success" title="Stripped copy downloaded" description={strippedNote} />
      )}

      {file && entries !== null && (
        <VStack gap={4}>
          <Banner
            status={hasGps ? 'warning' : parseError ? 'info' : 'info'}
            title={
              hasGps
                ? 'This photo contains location data'
                : parseError
                  ? 'EXIF could not be read'
                  : entries.length === 0
                    ? 'No EXIF metadata found'
                    : 'Metadata found — no GPS coordinates'
            }
            description={
              hasGps
                ? 'GPS coordinates are embedded. Download a stripped copy before posting publicly.'
                : parseError
                  ? parseError
                  : entries.length === 0
                    ? 'No EXIF metadata was embedded — it is safe from a metadata standpoint, or the format does not carry EXIF.'
                    : 'Metadata exists but no GPS coordinates were included.'
            }
          />

          <VStack gap={2}>
            <Heading level={3}>File</Heading>
            <MetadataList>
              <MetadataListItem label="Name">{file.name}</MetadataListItem>
              <MetadataListItem label="Size">{formatBytes(file.size)}</MetadataListItem>
              <MetadataListItem label="Type">{file.type || 'unknown'}</MetadataListItem>
            </MetadataList>
            <HStack gap={2} vAlign="center">
              <StatusDot variant="neutral" label="Local analysis only" />
              <Text type="supporting" display="block">
                Parsed locally — no upload occurred.
              </Text>
            </HStack>
          </VStack>

          {groups.map(group => (
            <VStack key={group} gap={2}>
              <Heading level={3}>{group} metadata</Heading>
              <MetadataList>
                {entries
                  .filter(e => e.group === group)
                  .map((entry, index) =>
                    entry.value.startsWith('http') ? (
                      <MetadataListItem key={`${entry.name}-${index}`} label={entry.name}>
                        <Link href={entry.value} target="_blank">
                          {entry.value}
                        </Link>
                      </MetadataListItem>
                    ) : (
                      <MetadataListItem key={`${entry.name}-${index}`} label={entry.name}>
                        {entry.value}
                      </MetadataListItem>
                    ),
                  )}
              </MetadataList>
            </VStack>
          ))}

          <Divider />
          <Text type="supporting" display="block">
            Canvas re-encode is lossy for JPEG. Screenshots and "export for web"
            from an editor also drop EXIF.
          </Text>
        </VStack>
      )}
    </VStack>
  );
}
