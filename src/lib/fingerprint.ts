// Browser fingerprint surface - reads only APIs the page can already see.
// Nothing is transmitted; the point is to show what any site could collect.

export interface FingerprintGroup {
  title: string;
  items: {label: string; value: string; isIdentifying?: boolean}[];
}

export async function collectFingerprint(): Promise<FingerprintGroup[]> {
  const groups: FingerprintGroup[] = [];

  const nav = navigator as Navigator & {
    deviceMemory?: number;
    hardwareConcurrency: number;
    userAgentData?: {brands: {brand: string; version: string}[]; mobile: boolean; platform: string};
    getBattery?: () => Promise<{level: number; charging: boolean}>;
  };

  // --- Hardware & OS ---
  groups.push({
    title: 'Hardware & OS',
    items: [
      {label: 'User agent', value: nav.userAgent, isIdentifying: true},
      {label: 'Platform', value: nav.userAgentData?.platform ?? (nav as unknown as {platform?: string}).platform ?? 'unknown'},
      {label: 'CPU threads', value: String(nav.hardwareConcurrency ?? 'unknown'), isIdentifying: true},
      {label: 'Device memory (GB)', value: nav.deviceMemory != null ? String(nav.deviceMemory) : 'not exposed'},
      {label: 'Languages', value: navigator.languages?.join(', ') ?? navigator.language, isIdentifying: true},
      {label: 'Timezone', value: Intl.DateTimeFormat().resolvedOptions().timeZone, isIdentifying: true},
      {label: 'Timezone offset', value: `${new Date().getTimezoneOffset()} min`},
      {label: 'Touch points', value: String(navigator.maxTouchPoints ?? 0)},
    ],
  });

  // --- Screen & rendering ---
  const canvasFp = await canvasFingerprint();
  groups.push({
    title: 'Screen & rendering',
    items: [
      {label: 'Screen size', value: `${screen.width} × ${screen.height}`},
      {label: 'Available area', value: `${screen.availWidth} × ${screen.availHeight}`},
      {label: 'Window size', value: `${window.innerWidth} × ${window.innerHeight}`},
      {label: 'Device pixel ratio', value: String(window.devicePixelRatio), isIdentifying: true},
      {label: 'Color depth', value: `${screen.colorDepth}-bit`},
      {label: 'Canvas hash', value: canvasFp, isIdentifying: true},
      {label: 'WebGL vendor', value: webglInfo().vendor},
      {label: 'WebGL renderer', value: webglInfo().renderer, isIdentifying: true},
    ],
  });

  // --- Features & preferences ---
  const audioFp = await audioFingerprint();
  groups.push({
    title: 'Features & preferences',
    items: [
      {label: 'Cookies enabled', value: navigator.cookieEnabled ? 'yes' : 'no'},
      {label: 'Do Not Track', value: navigator.doNotTrack === '1' ? 'enabled (often ignored)' : 'not set'},
      {label: 'Global Privacy Control', value: (navigator as unknown as {globalPrivacyControl?: boolean}).globalPrivacyControl ? 'enabled' : 'not set'},
      {label: 'Audio context hash', value: audioFp, isIdentifying: true},
      {label: 'PDF viewer', value: String((navigator as unknown as {pdfViewerEnabled?: boolean}).pdfViewerEnabled ?? 'unknown')},
      {label: 'Reduced motion', value: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'yes' : 'no', isIdentifying: true},
      {label: 'Color scheme', value: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'},
      {label: 'Forced colors', value: matchMedia('(forced-colors: active)').matches ? 'active' : 'none'},
      {label: 'Contrast preference', value: matchMedia('(prefers-contrast: more)').matches ? 'more' : 'normal'},
    ],
  });

  return groups;
}

/** Renders off-screen text and hashes the pixels: the classic canvas probe. */
async function canvasFingerprint(): Promise<string> {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 280;
    canvas.height = 60;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'unavailable';
    ctx.textBaseline = 'top';
    ctx.font = '16px "Arial"';
    ctx.fillStyle = '#f60';
    ctx.fillRect(0, 0, 120, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('sTools fingerprint \u{1F512} probe', 2, 4);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('sTools fingerprint \u{1F512} probe', 4, 8);
    const bytes = await canvasToBytes(canvas);
    const digest = await crypto.subtle.digest('SHA-256', toArrayBuffer(bytes));
    return [...new Uint8Array(digest)].slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return 'blocked';
  }
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

async function canvasToBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  const blob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  if (blob) {
    return new Uint8Array(await blob.arrayBuffer());
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) return new Uint8Array();
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  return new Uint8Array(data.buffer.slice(0));
}

function webglInfo(): {vendor: string; renderer: string} {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') as WebGLRenderingContext | null;
    if (!gl) return {vendor: 'unavailable', renderer: 'unavailable'};
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const vendor = ext ? String(gl.getParameter(ext.UNMASKED_VENDOR_WEBGL)) : String(gl.getParameter(gl.VENDOR));
    const renderer = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER));
    return {vendor, renderer};
  } catch {
    return {vendor: 'blocked', renderer: 'blocked'};
  }
}

/** OfflineAudioContext renders a tiny buffer whose exact values vary by engine. */
async function audioFingerprint(): Promise<string> {
  try {
    const Ctx = window.OfflineAudioContext ?? (window as unknown as {webkitOfflineAudioContext?: typeof OfflineAudioContext}).webkitOfflineAudioContext;
    if (!Ctx) return 'unavailable';
    const ctx = new Ctx(1, 4410, 44100);
    const oscillator = ctx.createOscillator();
    oscillator.type = 'triangle';
    oscillator.frequency.value = 10000;
    const compressor = ctx.createDynamicsCompressor();
    oscillator.connect(compressor);
    compressor.connect(ctx.destination);
    oscillator.start(0);
    const buffer = await ctx.startRendering();
    const data = buffer.getChannelData(0);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += Math.abs(data[i]);
    }
    return sum.toFixed(8);
  } catch {
    return 'blocked';
  }
}
