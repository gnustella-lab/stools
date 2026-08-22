export interface ExifEntry {
  group: string;
  name: string;
  value: string;
}

const TAG_NAMES: Record<string, Record<number, string>> = {
  IFD0: {
    0x010e: 'Image description',
    0x010f: 'Camera make',
    0x0110: 'Camera model',
    0x0112: 'Orientation',
    0x011a: 'X resolution',
    0x011b: 'Y resolution',
    0x0128: 'Resolution unit',
    0x0131: 'Software',
    0x0132: 'Modify date',
    0x013b: 'Artist',
    0x8298: 'Copyright',
    0x8769: 'Exif pointer',
    0x8825: 'GPS pointer',
  },
  Exif: {
    0x829a: 'Exposure time',
    0x829d: 'F number',
    0x8827: 'ISO speed',
    0x9003: 'Date taken',
    0x9004: 'Date digitized',
    0x9000: 'Exif version',
    0x920a: 'Focal length',
    0xa002: 'Pixel X dimension',
    0xa003: 'Pixel Y dimension',
    0xa405: 'Focal length (35mm)',
    0xa406: 'Scene capture type',
    0x9286: 'User comment',
    0xa430: 'Camera owner',
    0xa433: 'Lens make',
    0xa434: 'Lens model',
    0xa435: 'Lens serial number',
    0xc614: 'Camera body serial',
  },
  GPS: {
    0x0000: 'GPS version',
    0x0001: 'Latitude reference',
    0x0002: 'Latitude',
    0x0003: 'Longitude reference',
    0x0004: 'Longitude',
    0x0005: 'Altitude reference',
    0x0006: 'Altitude',
    0x0007: 'GPS timestamp',
    0x001d: 'GPS date',
  },
};

const TYPE_SIZES = [0, 1, 1, 2, 4, 8, 1, 1, 2, 4, 8];

function readUint16(view: DataView, offset: number, little: boolean): number {
  return view.getUint16(offset, little);
}

function readUint32(view: DataView, offset: number, little: boolean): number {
  return view.getUint32(offset, little);
}

export function parseExif(buffer: ArrayBuffer): ExifEntry[] {
  const view = new DataView(buffer);
  const entries: ExifEntry[] = [];

  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) {
    throw new Error('Not a JPEG file. PNG, WebP and other formats can still be stripped via re-encode.');
  }

  let tiffStart = -1;
  let offset = 2;
  while (offset + 4 <= view.byteLength) {
    const marker = view.getUint16(offset);
    const size = view.getUint16(offset + 2);
    if ((marker & 0xff00) !== 0xff00) break;
    if (marker === 0xffe1) {
      const isExif =
        view.getUint32(offset + 4) === 0x45786966 && view.getUint16(offset + 8) === 0x0000;
      if (isExif) {
        tiffStart = offset + 10;
        break;
      }
    }
    offset += 2 + size;
  }

  if (tiffStart < 0) {
    return [];
  }

  const little = view.getUint16(tiffStart) === 0x4949;
  const readIfd = (
    dirStart: number,
    group: string,
    gpsRationals?: Record<number, number[]>,
  ): void => {
    if (dirStart + 2 > view.byteLength) return;
    const count = readUint16(view, dirStart, little);
    for (let i = 0; i < count; i++) {
      const entryOffset = dirStart + 2 + i * 12;
      if (entryOffset + 12 > view.byteLength) return;
      const tag = readUint16(view, entryOffset, little);
      const type = readUint16(view, entryOffset + 2, little);
      const numValues = readUint32(view, entryOffset + 4, little);
      const valueSize = TYPE_SIZES[type] ?? 1;
      const totalSize = valueSize * numValues;
      const valueOffset =
        totalSize <= 4 ? entryOffset + 8 : tiffStart + readUint32(view, entryOffset + 8, little);

      const name = TAG_NAMES[group]?.[tag] ?? `Tag 0x${tag.toString(16).padStart(4, '0')}`;
      let value = '';

      try {
        if (type === 2 && valueOffset + numValues <= view.byteLength) {
          value = new TextDecoder().decode(new Uint8Array(buffer, valueOffset, Math.max(0, numValues - 1)));
        } else if (type === 5 || type === 10) {
          const rationals: number[] = [];
          for (let v = 0; v < Math.min(numValues, 3); v++) {
            const numOff = valueOffset + v * 8;
            if (numOff + 8 > view.byteLength) break;
            const num = readUint32(view, numOff, little);
            const den = readUint32(view, numOff + 4, little) || 1;
            rationals.push(num / den);
          }
          value = rationals.map(r => (Number.isInteger(r) ? String(r) : r.toFixed(4))).join(', ');
          if (gpsRationals && rationals.length === 3) {
            gpsRationals[tag] = rationals;
          }
        } else if (type === 3 || type === 8) {
          const shorts: number[] = [];
          for (let v = 0; v < Math.min(numValues, 8); v++) {
            if (valueOffset + v * 2 + 2 > view.byteLength) break;
            shorts.push(readUint16(view, valueOffset + v * 2, little));
          }
          value = shorts.join(', ');
        } else if (type === 4 || type === 9 || type === 1 || type === 7) {
          const nums: number[] = [];
          for (let v = 0; v < Math.min(numValues, 8); v++) {
            const off = valueOffset + v * valueSize;
            if (off + valueSize > view.byteLength) break;
            nums.push(valueSize >= 4 ? readUint32(view, off, little) : view.getUint8(off));
          }
          value = type === 7 && numValues > 64 ? `${numValues} bytes of data` : nums.join(', ');
        }
      } catch {
        value = '(unreadable)';
      }

      if (value !== '') {
        entries.push({group, name, value});
      }
    }
  };

  const ifd0Offset = tiffStart + readUint32(view, tiffStart + 4, little);
  let exifDirStart = -1;
  let gpsDirStart = -1;

  const ifd0Count = readUint16(view, ifd0Offset, little);
  for (let i = 0; i < ifd0Count; i++) {
    const entryOffset = ifd0Offset + 2 + i * 12;
    const tag = readUint16(view, entryOffset, little);
    const val = readUint32(view, entryOffset + 8, little);
    if (tag === 0x8769) exifDirStart = tiffStart + val;
    if (tag === 0x8825) gpsDirStart = tiffStart + val;
  }

  readIfd(ifd0Offset, 'IFD0');

  if (exifDirStart > 0) {
    readIfd(exifDirStart, 'Exif');
  }

  const gpsValues: Record<number, number[]> = {};
  if (gpsDirStart > 0) {
    readIfd(gpsDirStart, 'GPS', gpsValues);
  }

  const latRefEntry = entries.find(e => e.name === 'Latitude reference');
  const lonRefEntry = entries.find(e => e.name === 'Longitude reference');
  const latRatios = gpsValues[0x0002];
  const lonRatios = gpsValues[0x0004];
  if (latRefEntry && lonRefEntry && latRatios && lonRatios) {
    const dec = (ratios: number[], ref: string): number => {
      const d = ratios[0] ?? 0;
      const m = ratios[1] ?? 0;
      const s = ratios[2] ?? 0;
      let deg = d + m / 60 + s / 3600;
      if (ref.startsWith('S') || ref.startsWith('W')) deg = -deg;
      return deg;
    };
    const lat = dec(latRatios, latRefEntry.value);
    const lon = dec(lonRatios, lonRefEntry.value);
    entries.push({
      group: 'GPS',
      name: 'Coordinates (decimal)',
      value: `${lat.toFixed(6)}, ${lon.toFixed(6)}`,
    });
    entries.push({
      group: 'GPS',
      name: 'Map link',
      value: `https://www.openstreetmap.org/?mlat=${lat.toFixed(6)}&mlon=${lon.toFixed(6)}#map=15/${lat.toFixed(4)}/${lon.toFixed(4)}`,
    });
  }

  return entries;
}

export async function stripImageMetadata(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    throw new Error('Canvas is not available in this browser.');
  }
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  const quality = mime === 'image/jpeg' ? 0.92 : undefined;
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => {
        if (blob) resolve(blob);
        else reject(new Error('Could not re-encode the image.'));
      },
      mime,
      quality,
    );
  });
}

export function strippedFilename(original: string, mime: string): string {
  const stem = original.replace(/\.[^.]+$/, '') || 'image';
  const ext = mime === 'image/png' ? 'png' : 'jpg';
  return `${stem}-stripped.${ext}`;
}
