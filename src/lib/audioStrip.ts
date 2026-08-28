export interface AudioInspectResult {
  format: string;
  hasId3v2: boolean;
  hasId3v1: boolean;
  frames: string[];
  warnings: string[];
}

function hasId3v2(bytes: Uint8Array): boolean {
  return bytes.length >= 3 && bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33; // ID3
}

function hasId3v1(bytes: Uint8Array): boolean {
  if (bytes.length < 128) return false;
  const tail = bytes.slice(bytes.length - 128);
  return tail[0] === 0x54 && tail[1] === 0x41 && tail[2] === 0x47; // TAG
}

function parseId3v2Frames(bytes: Uint8Array): string[] {
  if (!hasId3v2(bytes)) return [];
  const frames: string[] = [];
  // ID3v2 header 10 bytes, then frames
  let offset = 10;
  // size is synchsafe
  const tagSize =
    ((bytes[6] & 0x7f) << 21) | ((bytes[7] & 0x7f) << 14) | ((bytes[8] & 0x7f) << 7) | (bytes[9] & 0x7f);
  const end = Math.min(10 + tagSize, bytes.length);
  while (offset + 10 <= end) {
    const id = String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
    if (!/^[A-Z0-9]{4}$/.test(id)) break;
    if (id === '\x00\x00\x00\x00') break;
    const size = (bytes[offset + 4] << 24) | (bytes[offset + 5] << 16) | (bytes[offset + 6] << 8) | bytes[offset + 7];
    if (size <= 0 || offset + 10 + size > end) break;
    frames.push(id);
    offset += 10 + size;
  }
  return frames;
}

export function inspectAudioBytes(bytes: Uint8Array, filename: string): AudioInspectResult {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const format = ext ? ext.toUpperCase() : hasId3v2(bytes) ? 'MP3' : 'UNKNOWN';
  const id3v2 = hasId3v2(bytes);
  const id3v1 = hasId3v1(bytes);
  const frames = parseId3v2Frames(bytes);
  const warnings: string[] = [];
  if (id3v2) warnings.push(`ID3v2 tag found with frames: ${frames.join(', ') || 'none parsed'} — may contain artist, album, encoder, and cover art.`);
  if (id3v1) warnings.push('ID3v1 tag at end of file (128 bytes) — contains title/artist/album.');
  if (!id3v2 && !id3v1) warnings.push('No ID3 tags detected — file may be clean or uses Vorbis/MP4 tags (not stripped by this tool).');
  if (frames.includes('APIC') || frames.includes('PIC')) warnings.push('Embedded cover art (APIC) present — can leak thumbnail GPS if source фото had location.');
  if (ext === 'm4a' || ext === 'mp4' || ext === 'mov') warnings.push('MP4/M4A/MOV use ISO-BMFF boxes — use Metadata Remover for those, not this tool.');
  return { format, hasId3v2: id3v2, hasId3v1: id3v1, frames, warnings };
}

export function stripAudioTags(bytes: Uint8Array): { blob: Blob; removed: string[]; mime: string } {
  const id3v2 = hasId3v2(bytes);
  const id3v1 = hasId3v1(bytes);
  const removed: string[] = [];
  let start = 0;
  let end = bytes.length;

  if (id3v2) {
    const tagSize =
      ((bytes[6] & 0x7f) << 21) | ((bytes[7] & 0x7f) << 14) | ((bytes[8] & 0x7f) << 7) | (bytes[9] & 0x7f);
    start = 10 + tagSize;
    removed.push(`ID3v2 (${tagSize + 10} bytes)`);
  }
  if (id3v1) {
    end = bytes.length - 128;
    removed.push('ID3v1 (128 bytes)');
  }
  if (removed.length === 0) throw new Error('No ID3v1/ID3v2 tags found to strip. For MP4/M4A use the Video Metadata Remover; for FLAC/OGG re-encode without tags.');

  const cleaned = bytes.slice(start, end);
  const blob = new Blob([cleaned as unknown as BlobPart], { type: 'audio/mpeg' });
  return { blob, removed, mime: 'audio/mpeg' };
}

export async function inspectAudioFile(file: File): Promise<AudioInspectResult> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  return inspectAudioBytes(bytes, file.name);
}

export async function stripAudioFile(file: File): Promise<{ blob: Blob; removed: string[] }> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  return stripAudioTags(bytes);
}
