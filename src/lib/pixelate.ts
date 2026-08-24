// Region pixelation - re-encodes a chosen region so faces, plates and tokens
// become unrecoverable. Runs on an offscreen canvas; no upload.

export interface PixelateOptions {
  /** 0..1 fractions of the image dimensions. */
  region: {x: number; y: number; width: number; height: number};
  /** Target mosaic block height in device pixels. */
  blockSize: number;
}

export interface PixelateResult {
  blob: Blob;
  mime: string;
  width: number;
  height: number;
}

export async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(file);
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Could not decode this image.'));
      image.src = url;
    });
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function bitmapSize(bmp: ImageBitmap | HTMLImageElement): {width: number; height: number} {
  if ('naturalWidth' in bmp) {
    return {width: bmp.naturalWidth || bmp.width, height: bmp.naturalHeight || bmp.height};
  }
  return {width: bmp.width, height: bmp.height};
}

export {bitmapSize};

/**
 * Pixelates `region` of the source by downscaling to roughly one mosaic
 * block per `blockSize` pixels and upscaling back with smoothing disabled so
 * every block stays a hard square (a blur could still leak edge information).
 */
export async function pixelateRegion(
  file: File,
  options: PixelateOptions,
): Promise<PixelateResult> {
  const bmp = await loadBitmap(file);
  const {width, height} = bitmapSize(bmp);

  const rx = clamp(options.region.x) * width;
  const ry = clamp(options.region.y) * height;
  const rw = clampSpan(options.region.x, options.region.width) * width;
  const rh = clampSpan(options.region.y, options.region.height) * height;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas is not available in this browser.');
  }
  ctx.drawImage(bmp as CanvasImageSource, 0, 0);

  if (rw < 8 || rh < 8) {
    throw new Error('The selected region is too small. Draw a larger box over the area to censor.');
  }

  const blocksX = Math.max(2, Math.round(rw / options.blockSize));
  const blocksY = Math.max(2, Math.round(rh / options.blockSize));

  // Downscale into a blocksX × blocksY buffer…
  const tmp = document.createElement('canvas');
  tmp.width = blocksX;
  tmp.height = blocksY;
  const tctx = tmp.getContext('2d');
  if (!tctx) {
    throw new Error('Canvas is not available in this browser.');
  }
  tctx.imageSmoothingEnabled = true;
  tctx.drawImage(canvas, rx, ry, rw, rh, 0, 0, blocksX, blocksY);

  // …read the averaged block colours back and paint them as explicit solid
  // rectangles. Painting avoids relying on imageSmoothingEnabled for the
  // upscale, which not every engine honours; fillRect cannot blur.
  const blockData = tctx.getImageData(0, 0, blocksX, blocksY).data;
  const blockWidth = rw / blocksX;
  const blockHeight = rh / blocksY;
  for (let by = 0; by < blocksY; by++) {
    for (let bx = 0; bx < blocksX; bx++) {
      const i = (by * blocksX + bx) * 4;
      ctx.fillStyle = `rgb(${blockData[i]}, ${blockData[i + 1]}, ${blockData[i + 2]})`;
      ctx.fillRect(
        rx + bx * blockWidth,
        ry + by * blockHeight,
        blockWidth + 0.5,
        blockHeight + 0.5,
      );
    }
  }

  const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  const blob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve, mime, 0.92));
  if (!blob) {
    throw new Error('Could not encode the result image.');
  }
  return {blob, mime, width, height};
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function clampSpan(start: number, span: number): number {
  return Math.max(0.001, Math.min(1 - start, span));
}
