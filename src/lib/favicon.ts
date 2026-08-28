export async function resizeWithCanvas(file: File, size: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not available');
  ctx.clearRect(0, 0, size, size);
  ctx.drawImage(bitmap, 0, 0, size, size);
  bitmap.close();
  const blob = await new Promise<Blob | null>(res => canvas.toBlob(b => res(b), 'image/png'));
  if (!blob) throw new Error('Failed to encode PNG');
  return blob;
}

export async function pngsToIco(pngBlobs: { blob: Blob; size: number }[]): Promise<Blob> {
  // ICO header: 6 bytes + 16 bytes per image + PNG data
  const headerSize = 6 + pngBlobs.length * 16;
  const buffers: BlobPart[] = [];
  let offset = headerSize;

  // read all png buffers first
  const pngBuffers: Uint8Array[] = [];
  for (const { blob } of pngBlobs) {
    const buf = new Uint8Array(await blob.arrayBuffer());
    pngBuffers.push(buf);
  }

  const header = new ArrayBuffer(6);
  const hv = new DataView(header);
  hv.setUint16(0, 0, true); // reserved
  hv.setUint16(2, 1, true); // type ico
  hv.setUint16(4, pngBlobs.length, true);
  buffers.push(header);

  for (let i = 0; i < pngBlobs.length; i++) {
    const { size } = pngBlobs[i];
    const pngBuf = pngBuffers[i];
    const entry = new ArrayBuffer(16);
    const ev = new DataView(entry);
    ev.setUint8(0, size === 256 ? 0 : size);
    ev.setUint8(1, size === 256 ? 0 : size);
    ev.setUint8(2, 0); // colors
    ev.setUint8(3, 0); // reserved
    ev.setUint16(4, 1, true); // color planes
    ev.setUint16(6, 32, true); // bits per pixel
    ev.setUint32(8, pngBuf.byteLength, true);
    ev.setUint32(12, offset, true);
    offset += pngBuf.byteLength;
    buffers.push(entry);
  }

  for (const buf of pngBuffers) buffers.push(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);

  return new Blob(buffers, { type: 'image/x-icon' });
}

export function downloadLinkForBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
