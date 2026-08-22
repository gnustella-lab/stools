export interface VideoStripResult {
  blob: Blob;
  droppedBoxes: string[];
  droppedBytes: number;
}

/**
 * Boxes that carry user/application metadata rather than playback-critical data.
 * Dropping them anywhere in the tree removes iTunes-style tags, GPS traces,
 * camera notes and XMP packets embedded by editors.
 */
const METADATA_BOXES = new Set(['udta', 'meta', 'XMP_', 'Xtra']);

/** Container boxes whose children are safe to inspect recursively. */
const CONTAINER_BOXES = new Set([
  'moov',
  'trak',
  'mdia',
  'minf',
  'stbl',
  'edts',
  'dinf',
  'mvex',
  'tref',
  'iprp',
  'ipco',
]);

const MAX_DEPTH = 8;

interface WalkResult {
  parts: BlobPart[];
  size: number;
}

interface SharedState {
  droppedBoxes: string[];
  droppedBytes: number;
}

function readType(view: DataView, offset: number): string {
  let type = '';
  for (let i = 0; i < 4; i++) {
    type += String.fromCharCode(view.getUint8(offset + i));
  }
  return type;
}

function boxHeaderSize(view: DataView, offset: number): number {
  return view.getUint32(offset) === 1 ? 16 : 8;
}

function boxSize(view: DataView, offset: number, end: number): number {
  const size = view.getUint32(offset);
  if (size === 1) {
    // 64-bit largesize variant.
    return Number(view.getBigUint64(offset + 8));
  }
  if (size === 0) {
    // Box extends to the end of the enclosing range.
    return end - offset;
  }
  return size;
}

/** Builds a fresh ISO-BMFF box header for the given content size. */
function makeHeader(type: string, contentSize: number): BlobPart[] {
  if (contentSize + 8 <= 0xffffffff) {
    const header = new Uint8Array(8);
    const view = new DataView(header.buffer);
    view.setUint32(0, contentSize + 8);
    for (let i = 0; i < 4; i++) {
      view.setUint8(4 + i, type.charCodeAt(i));
    }
    return [header];
  }
  const header = new Uint8Array(16);
  const view = new DataView(header.buffer);
  view.setUint32(0, 1);
  for (let i = 0; i < 4; i++) {
    view.setUint8(4 + i, type.charCodeAt(i));
  }
  view.setBigUint64(8, BigInt(contentSize + 16));
  return [header];
}

function slice(view: DataView, start: number, end: number): BlobPart {
  return (view.buffer as ArrayBuffer).slice(start, end);
}

/**
 * Rewrites a range of boxes: metadata boxes are dropped, known containers are
 * recursed into with recomputed sizes, everything else is copied verbatim.
 */
function rewrite(
  view: DataView,
  start: number,
  end: number,
  depth: number,
  state: SharedState,
): WalkResult {
  const parts: BlobPart[] = [];
  let size = 0;
  let offset = start;

  while (offset < end) {
    if (end - offset < 8) {
      // Malformed tail — keep the remaining bytes untouched instead of failing.
      const tail = slice(view, offset, end);
      parts.push(tail);
      size += end - offset;
      break;
    }
    const headerSize = boxHeaderSize(view, offset);
    const total = boxSize(view, offset, end);
    if (total < headerSize || offset + total > end) {
      const tail = slice(view, offset, end);
      parts.push(tail);
      size += end - offset;
      break;
    }
    const type = readType(view, offset + 4);

    if (METADATA_BOXES.has(type)) {
      state.droppedBoxes.push(type);
      state.droppedBytes += total;
    } else if (depth < MAX_DEPTH && CONTAINER_BOXES.has(type)) {
      const inner = rewrite(view, offset + headerSize, offset + total, depth + 1, state);
      const header = makeHeader(type, inner.size);
      parts.push(...header, ...inner.parts);
      size += header.length * 8 + inner.size;
    } else {
      parts.push(slice(view, offset, offset + total));
      size += total;
    }
    offset += total;
  }

  return {parts, size};
}

function looksLikeIsoBmff(view: DataView): boolean {
  if (view.byteLength < 12) return false;
  const size = view.getUint32(0);
  if (size !== 0 && size !== 1 && (size < 8 || size > view.byteLength)) return false;
  const type = readType(view, 4);
  return ['ftyp', 'moov', 'mdat', 'wide', 'free', 'skip', 'styp'].includes(type);
}

function videoMime(name: string, declared: string): string {
  if (declared.startsWith('video/') && declared !== 'video/webm') return declared;
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'mov') return 'video/quicktime';
  if (ext === 'm4v') return 'video/x-m4v';
  if (ext === '3gp') return 'video/3gpp';
  return 'video/mp4';
}

export function cleanFilename(original: string): string {
  const dot = original.lastIndexOf('.');
  const stem = dot > 0 ? original.slice(0, dot) : original;
  const ext = dot > 0 ? original.slice(dot) : '';
  return `${stem}-clean${ext}`;
}

/**
 * Rewrites an MP4/MOV file without its metadata boxes. Pixels, audio and
 * timing data are copied byte-for-byte, so quality is preserved.
 */
export async function stripVideoMetadata(file: File): Promise<VideoStripResult> {
  const buffer = await file.arrayBuffer();
  const view = new DataView(buffer);

  if (!looksLikeIsoBmff(view)) {
    throw new Error(
      'Not an MP4/MOV file. Only ISO-BMFF containers (MP4, M4V, MOV, 3GP) are supported — WebM/MKV must be re-exported.',
    );
  }

  const state: SharedState = {droppedBoxes: [], droppedBytes: 0};
  const result = rewrite(view, 0, buffer.byteLength, 0, state);

  if (state.droppedBytes === 0) {
    throw new Error('No removable metadata boxes were found in this file.');
  }

  const blob = new Blob(result.parts, {type: videoMime(file.name, file.type)});
  return {blob, droppedBoxes: state.droppedBoxes, droppedBytes: state.droppedBytes};
}
