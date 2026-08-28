export interface TypeScaleConfig {
  base: number; // px
  ratio: number;
  steps: number[]; // e.g. [-1,0,1,2,3,4]
}

export const RATIOS: Record<string, number> = {
  'Minor Second (1.067)': 1.067,
  'Major Second (1.125)': 1.125,
  'Minor Third (1.2)': 1.2,
  'Major Third (1.25)': 1.25,
  'Perfect Fourth (1.333)': 1.333,
  'Augmented Fourth (1.414)': 1.414,
  'Perfect Fifth (1.5)': 1.5,
  'Golden Ratio (1.618)': 1.618,
};

export function scaleValue(base: number, ratio: number, step: number): number {
  return base * Math.pow(ratio, step);
}

export function buildClamp(
  minPx: number,
  maxPx: number,
  minVw = 320,
  maxVw = 1280,
): string {
  // clamp(min, fluid, max) where fluid = calc(min + (max-min)*(100vw - minVw)/(maxVw-minVw))
  const slope = (maxPx - minPx) / (maxVw - minVw);
  const intercept = minPx - slope * minVw;
  const slopeVw = (slope * 100).toFixed(4);
  const interceptPx = intercept.toFixed(2);
  return `clamp(${minPx.toFixed(2)}px, ${interceptPx}px + ${slopeVw}vw, ${maxPx.toFixed(2)}px)`;
}

export function buildScaleTable(config: TypeScaleConfig): { step: number; px: number; rem: number; clamp: string }[] {
  return config.steps.map(step => {
    const px = scaleValue(config.base, config.ratio, step);
    const rem = px / 16;
    // fluid between 0.9x and 1.1x
    const minPx = px * 0.9;
    const maxPx = px * 1.1;
    return { step, px: Math.round(px * 100) / 100, rem: Math.round(rem * 100) / 100, clamp: buildClamp(minPx, maxPx) };
  });
}

export function cssVarsForScale(table: { step: number; px: number }[]): string {
  return table.map(t => `--text-${t.step}: ${t.px}px;`).join('\n');
}
