export interface PaletteColor {
  hex: string;
  rgb: { r: number; g: number; b: number };
  count: number;
  percentage: number;
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`;
}

function dist(a: number[], b: number[]): number {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
}

export async function extractPaletteFromImageData(
  imageData: ImageData,
  k = 6,
  sampleStep = 8,
): Promise<PaletteColor[]> {
  const pixels: number[][] = [];
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4 * sampleStep) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (a < 128) continue;
    // skip near-white / near-black extremes to improve palette
    pixels.push([r, g, b]);
    if (pixels.length > 8000) break;
  }
  if (pixels.length === 0) throw new Error('No opaque pixels found.');

  // Initialize centroids via k random pixels
  const centroids: number[][] = [];
  const used = new Set<number>();
  while (centroids.length < Math.min(k, pixels.length)) {
    const idx = Math.floor(Math.random() * pixels.length);
    if (used.has(idx)) continue;
    used.add(idx);
    centroids.push([...pixels[idx]]);
  }

  // k-means 5 iterations
  for (let iter = 0; iter < 5; iter++) {
    const clusters: number[][][] = Array.from({ length: centroids.length }, () => []);
    for (const p of pixels) {
      let best = 0;
      let bestDist = Infinity;
      for (let c = 0; c < centroids.length; c++) {
        const d = dist(p, centroids[c]);
        if (d < bestDist) {
          bestDist = d;
          best = c;
        }
      }
      clusters[best].push(p);
    }
    for (let c = 0; c < centroids.length; c++) {
      const cluster = clusters[c];
      if (cluster.length === 0) continue;
      const avg = [0, 0, 0];
      for (const p of cluster) {
        avg[0] += p[0];
        avg[1] += p[1];
        avg[2] += p[2];
      }
      centroids[c] = avg.map(v => Math.round(v / cluster.length));
    }
  }

  // Count assignment
  const counts = new Array(centroids.length).fill(0);
  for (const p of pixels) {
    let best = 0;
    let bestDist = Infinity;
    for (let c = 0; c < centroids.length; c++) {
      const d = dist(p, centroids[c]);
      if (d < bestDist) {
        bestDist = d;
        best = c;
      }
    }
    counts[best]++;
  }

  const total = pixels.length;
  const result: PaletteColor[] = centroids.map((c, i) => ({
    hex: rgbToHex(c[0], c[1], c[2]),
    rgb: { r: c[0], g: c[1], b: c[2] },
    count: counts[i],
    percentage: Math.round((counts[i] / total) * 1000) / 10,
  }));

  result.sort((a, b) => b.count - a.count);
  return result;
}

export async function extractPaletteFromCanvas(
  canvas: HTMLCanvasElement,
  k = 6,
): Promise<PaletteColor[]> {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available.');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return extractPaletteFromImageData(imageData, k);
}

export function paletteToCssVars(colors: PaletteColor[], prefix = '--color'): string {
  return colors.map((c, i) => `${prefix}-${i + 1}: ${c.hex};`).join('\n');
}

export function paletteToTailwind(colors: PaletteColor[]): string {
  const entries = colors.map((c, i) => `  'brand-${i + 1}': '${c.hex}'`).join(',\n');
  return `// tailwind.config.js\nmodule.exports = {\n  theme: { extend: { colors: {\n${entries}\n  }}}\n}`;
}
