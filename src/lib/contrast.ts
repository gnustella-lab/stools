function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function toLinear(v: number): number {
  const s = v / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(hex: string): number | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  return 0.2126 * toLinear(rgb.r) + 0.7152 * toLinear(rgb.g) + 0.0722 * toLinear(rgb.b);
}

export function contrastRatio(fg: string, bg: string): number | null {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  if (l1 == null || l2 == null) return null;
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export type WcagLevel = 'fail' | 'AA' | 'AAA';

export function wcagRating(ratio: number, _isLargeText = false): { normal: WcagLevel; large: WcagLevel } {
  const normal: WcagLevel = ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : 'fail';
  const large: WcagLevel = ratio >= 4.5 ? 'AAA' : ratio >= 3 ? 'AA' : 'fail';
  // return both
  return { normal, large };
  // isLargeText param kept for future but both returned
}

// Simple daltonism simulation via matrix approximations (not medical)
function applyMatrix(rgb: { r: number; g: number; b: number }, m: number[][]): { r: number; g: number; b: number } {
  const r = Math.round(m[0][0] * rgb.r + m[0][1] * rgb.g + m[0][2] * rgb.b);
  const g = Math.round(m[1][0] * rgb.r + m[1][1] * rgb.g + m[1][2] * rgb.b);
  const b = Math.round(m[2][0] * rgb.r + m[2][1] * rgb.g + m[2][2] * rgb.b);
  return {
    r: Math.min(255, Math.max(0, r)),
    g: Math.min(255, Math.max(0, g)),
    b: Math.min(255, Math.max(0, b)),
  };
}

export type DaltonismType = 'protanopia' | 'deuteranopia' | 'tritanopia';

const MATRICES: Record<DaltonismType, number[][]> = {
  // approximations
  protanopia: [
    [0.567, 0.433, 0],
    [0.558, 0.442, 0],
    [0, 0.242, 0.758],
  ],
  deuteranopia: [
    [0.625, 0.375, 0],
    [0.7, 0.3, 0],
    [0, 0.3, 0.7],
  ],
  tritanopia: [
    [0.95, 0.05, 0],
    [0, 0.433, 0.567],
    [0, 0.475, 0.525],
  ],
};

export function simulateDaltonism(hex: string, type: DaltonismType): string | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const m = MATRICES[type];
  const sim = applyMatrix(rgb, m);
  return `#${[sim.r, sim.g, sim.b].map(v => v.toString(16).padStart(2, '0')).join('')}`;
}
