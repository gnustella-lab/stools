export interface ShadowConfig {
  x: number;
  y: number;
  blur: number;
  spread: number;
  color: string;
  inset: boolean;
  opacity?: number;
}

export function buildShadowCss(shadows: ShadowConfig[]): string {
  if (shadows.length === 0) return 'none';
  return shadows
    .map(s => {
      const inset = s.inset ? 'inset ' : '';
      return `${inset}${s.x}px ${s.y}px ${s.blur}px ${s.spread}px ${s.color}`;
    })
    .join(', ');
}

export function buildRadiusCss(values: { tl: number; tr: number; br: number; bl: number }): string {
  const { tl, tr, br, bl } = values;
  if (tl === tr && tr === br && br === bl) return `${tl}px`;
  if (tl === br && tr === bl) return `${tl}px ${tr}px`;
  return `${tl}px ${tr}px ${br}px ${bl}px`;
}

export function defaultShadow(): ShadowConfig {
  return { x: 0, y: 8, blur: 24, spread: 0, color: 'rgba(0,0,0,0.12)', inset: false };
}
