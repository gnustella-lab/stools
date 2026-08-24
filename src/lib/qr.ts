import QRCode from 'qrcode';
import jsQR from 'jsqr';

export interface QrGenerateOptions {
  text: string;
  size: number;
  margin: number;
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H';
  darkColor: string;
  lightColor: string;
}

export async function generateQrDataUrl(options: QrGenerateOptions): Promise<string> {
  const {text, size, margin, errorCorrectionLevel, darkColor, lightColor} = options;
  if (!text) throw new Error('Text is required to generate a QR code.');
  return QRCode.toDataURL(text, {
    width: size,
    margin,
    errorCorrectionLevel,
    color: {dark: darkColor, light: lightColor},
  });
}

export async function generateQrToCanvas(
  canvas: HTMLCanvasElement,
  options: QrGenerateOptions,
): Promise<void> {
  const {text, size, margin, errorCorrectionLevel, darkColor, lightColor} = options;
  if (!text) throw new Error('Text is required.');
  await QRCode.toCanvas(canvas, text, {
    width: size,
    margin,
    errorCorrectionLevel,
    color: {dark: darkColor, light: lightColor},
  });
}

export interface QrScanResult {
  text: string;
  rawBytes?: Uint8Array;
}

export async function scanQrFromFile(file: File): Promise<QrScanResult | null> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    throw new Error('Canvas not available.');
  }
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const code = jsQR(imageData.data, imageData.width, imageData.height, {inversionAttempts: 'attemptBoth'});
  if (!code) return null;
  return {text: code.data, rawBytes: code.binaryData as unknown as Uint8Array | undefined};
}

export async function scanQrFromImageData(imageData: ImageData): Promise<QrScanResult | null> {
  const code = jsQR(imageData.data, imageData.width, imageData.height, {inversionAttempts: 'attemptBoth'});
  if (!code) return null;
  return {text: code.data};
}
