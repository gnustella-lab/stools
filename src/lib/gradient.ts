export type GradientType = 'linear' | 'radial' | 'conic';

export interface GradientStop {
  color: string;
  position: number; // 0-100
}

export interface GradientConfig {
  type: GradientType;
  angle: number; // for linear
  stops: GradientStop[];
  radialShape?: 'circle' | 'ellipse';
  radialPosition?: string; // e.g. "at center"
}

export function buildGradientCss(config: GradientConfig): string {
  const stopsStr = config.stops.map(s => `${s.color} ${s.position}%`).join(', ');
  if (config.type === 'linear') {
    return `linear-gradient(${config.angle}deg, ${stopsStr})`;
  }
  if (config.type === 'radial') {
    const shape = config.radialShape ?? 'ellipse';
    const pos = config.radialPosition ?? 'at center';
    return `radial-gradient(${shape} ${pos}, ${stopsStr})`;
  }
  // conic
  return `conic-gradient(from ${config.angle}deg at center, ${stopsStr})`;
}

export function parseHexColor(hex: string): { r: number; g: number; b: number } | null {
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

export function defaultStops(): GradientStop[] {
  return [
    { color: '#1f6feb', position: 0 },
    { color: '#ff2d55', position: 100 },
  ];
}

export function addStop(stops: GradientStop[], color = '#ffffff'): GradientStop[] {
  if (stops.length >= 5) return stops;
  const mid = stops.length === 0 ? 50 : Math.round((stops[stops.length - 1].position + (stops[0]?.position ?? 0)) / 2);
  return [...stops, { color, position: Math.min(100, Math.max(0, mid)) }].sort((a, b) => a.position - b.position);
}
