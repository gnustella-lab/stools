export interface MagicEntry {
  mime: string;
  exts: string[];
  magic: number[];
  offset: number;
  description: string;
}

export const MAGIC_DB: MagicEntry[] = [
  { mime: 'image/png', exts: ['png'], magic: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], offset: 0, description: 'PNG image' },
  { mime: 'image/jpeg', exts: ['jpg', 'jpeg'], magic: [0xff, 0xd8, 0xff], offset: 0, description: 'JPEG image' },
  { mime: 'image/gif', exts: ['gif'], magic: [0x47, 0x49, 0x46, 0x38], offset: 0, description: 'GIF image' },
  { mime: 'image/webp', exts: ['webp'], magic: [0x52, 0x49, 0x46, 0x46], offset: 0, description: 'WebP (RIFF)' },
  { mime: 'image/bmp', exts: ['bmp'], magic: [0x42, 0x4d], offset: 0, description: 'BMP image' },
  { mime: 'image/tiff', exts: ['tiff', 'tif'], magic: [0x49, 0x49, 0x2a, 0x00], offset: 0, description: 'TIFF little-endian' },
  { mime: 'image/tiff', exts: ['tiff', 'tif'], magic: [0x4d, 0x4d, 0x00, 0x2a], offset: 0, description: 'TIFF big-endian' },
  { mime: 'application/pdf', exts: ['pdf'], magic: [0x25, 0x50, 0x44, 0x46], offset: 0, description: 'PDF document' },
  { mime: 'application/zip', exts: ['zip', 'docx', 'xlsx', 'pptx', 'odt'], magic: [0x50, 0x4b, 0x03, 0x04], offset: 0, description: 'ZIP archive (Office docs are ZIP)' },
  { mime: 'application/gzip', exts: ['gz', 'tgz'], magic: [0x1f, 0x8b], offset: 0, description: 'GZIP archive' },
  { mime: 'video/mp4', exts: ['mp4', 'm4v', 'mov'], magic: [0x66, 0x74, 0x79, 0x70], offset: 4, description: 'ISO-BMFF (MP4/MOV) ftyp' },
  { mime: 'audio/mpeg', exts: ['mp3'], magic: [0x49, 0x44, 0x33], offset: 0, description: 'MP3 with ID3v2' },
  { mime: 'audio/mpeg', exts: ['mp3'], magic: [0xff, 0xfb], offset: 0, description: 'MP3 frame' },
  { mime: 'audio/flac', exts: ['flac'], magic: [0x66, 0x4c, 0x61, 0x43], offset: 0, description: 'FLAC audio' },
  { mime: 'audio/ogg', exts: ['ogg', 'oga'], magic: [0x4f, 0x67, 0x67, 0x53], offset: 0, description: 'OGG container' },
  { mime: 'video/webm', exts: ['webm'], magic: [0x1a, 0x45, 0xdf, 0xa3], offset: 0, description: 'WebM / Matroska' },
  { mime: 'application/wasm', exts: ['wasm'], magic: [0x00, 0x61, 0x73, 0x6d], offset: 0, description: 'WebAssembly' },
  { mime: 'text/plain', exts: ['txt'], magic: [], offset: 0, description: 'Plain text (fallback)' },
];

export interface MagicResult {
  detectedMime: string;
  detectedExts: string[];
  description: string;
  declaredExt: string;
  mismatch: boolean;
  isText: boolean;
  confidence: 'high' | 'medium' | 'low';
  bytesHex: string;
}

function bytesToHex(bytes: Uint8Array, n = 16): string {
  return [...bytes.slice(0, n)].map(b => b.toString(16).padStart(2, '0')).join(' ').toUpperCase();
}

function isLikelyText(bytes: Uint8Array): boolean {
  if (bytes.length === 0) return false;
  let nonPrintable = 0;
  for (let i = 0; i < Math.min(bytes.length, 1024); i++) {
    const b = bytes[i];
    if (b === 9 || b === 10 || b === 13) continue;
    if (b < 32 || b > 126) nonPrintable++;
  }
  return nonPrintable / Math.min(bytes.length, 1024) < 0.05;
}

export function detectMagic(bytes: Uint8Array, filename: string): MagicResult {
  const declaredExt = filename.split('.').pop()?.toLowerCase() ?? '';
  if (bytes.length === 0) throw new Error('Empty file.');

  for (const entry of MAGIC_DB) {
    if (entry.magic.length === 0) continue;
    if (bytes.length < entry.offset + entry.magic.length) continue;
    let ok = true;
    for (let i = 0; i < entry.magic.length; i++) {
      if (bytes[entry.offset + i] !== entry.magic[i]) { ok = false; break; }
    }
    if (ok) {
      // special: webp needs WEBP at 8
      if (entry.mime === 'image/webp') {
        if (bytes.length < 12 || bytes[8] !== 0x57 || bytes[9] !== 0x45 || bytes[10] !== 0x42 || bytes[11] !== 0x50) continue;
      }
      const mismatch = declaredExt ? !entry.exts.includes(declaredExt) : false;
      return {
        detectedMime: entry.mime,
        detectedExts: entry.exts,
        description: entry.description,
        declaredExt,
        mismatch,
        isText: false,
        confidence: 'high',
        bytesHex: bytesToHex(bytes),
      };
    }
  }

  const text = isLikelyText(bytes);
  return {
    detectedMime: text ? 'text/plain' : 'application/octet-stream',
    detectedExts: text ? ['txt', 'csv', 'json', 'log'] : [],
    description: text ? 'Plain text (no binary magic)' : 'Unknown binary (no magic matched)',
    declaredExt,
    mismatch: false,
    isText: text,
    confidence: text ? 'medium' : 'low',
    bytesHex: bytesToHex(bytes),
  };
}

export async function detectFileMagic(file: File): Promise<MagicResult> {
  const slice = file.slice(0, 32);
  const bytes = new Uint8Array(await slice.arrayBuffer());
  return detectMagic(bytes, file.name);
}
