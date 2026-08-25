import {secureRandomInt} from './random.ts';

export type GeoFormat = 'gpx' | 'geojson' | 'unknown';

export interface GeoAnonymizeOptions {
  decimalPlaces: number;
  noiseMeters: number;
  stripTime: boolean;
  stripElevation: boolean;
  stripMetadata: boolean;
}

export const DEFAULT_GEO_OPTIONS: GeoAnonymizeOptions = {
  decimalPlaces: 3,
  noiseMeters: 80,
  stripTime: true,
  stripElevation: true,
  stripMetadata: true,
};

export interface GeoAnonymizeResult {
  output: string;
  format: GeoFormat;
  points: number;
  note: string;
}

export function detectGeoFormat(input: string): GeoFormat {
  const trimmed = input.trim();
  if (!trimmed) return 'unknown';
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (isGeoJson(parsed)) return 'geojson';
    } catch {
      return 'unknown';
    }
  }
  if (/<gpx[\s>]/i.test(trimmed) || /<(?:trkpt|wpt|rtept)\b/i.test(trimmed)) {
    return 'gpx';
  }
  return 'unknown';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isGeoJson(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (typeof value.type === 'string') return true;
  if (Array.isArray(value.features) || Array.isArray(value.coordinates)) return true;
  return false;
}

function gaussian(): number {
  const u = (secureRandomInt(1_000_000) + 1) / 1_000_001;
  const v = (secureRandomInt(1_000_000) + 1) / 1_000_001;
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function shiftCoordinate(
  lat: number,
  lon: number,
  noiseMeters: number,
  decimalPlaces: number,
): [number, number] {
  const places = Math.max(0, Math.min(7, Math.floor(decimalPlaces)));
  let nextLat = lat;
  let nextLon = lon;
  if (noiseMeters > 0) {
    const dLat = (noiseMeters / 111_320) * gaussian();
    const cos = Math.cos((lat * Math.PI) / 180);
    const denom = Math.max(0.05, Math.abs(cos)) * 111_320;
    const dLon = (noiseMeters / denom) * gaussian();
    nextLat = lat + dLat;
    nextLon = lon + dLon;
  }
  nextLat = Math.max(-90, Math.min(90, nextLat));
  nextLon = ((((nextLon + 180) % 360) + 360) % 360) - 180;
  return [Number(nextLat.toFixed(places)), Number(nextLon.toFixed(places))];
}

function roundAlt(value: number, decimalPlaces: number): number {
  return Number(value.toFixed(Math.max(0, Math.min(2, decimalPlaces))));
}

function walkCoords(value: unknown, options: GeoAnonymizeOptions, counter: {points: number}): unknown {
  if (!Array.isArray(value) || value.length === 0) return value;
  if (typeof value[0] === 'number' && typeof value[1] === 'number') {
    const lon = value[0];
    const lat = value[1];
    const [nextLat, nextLon] = shiftCoordinate(lat, lon, options.noiseMeters, options.decimalPlaces);
    counter.points += 1;
    const next: number[] = [nextLon, nextLat];
    if (typeof value[2] === 'number') {
      if (!options.stripElevation) next.push(roundAlt(value[2], 1));
    }
    return next;
  }
  return value.map(item => walkCoords(item, options, counter));
}

const META_KEYS = new Set([
  'name',
  'desc',
  'description',
  'title',
  'time',
  'timestamp',
  'ele',
  'elevation',
  'alt',
  'altitude',
  'cmt',
  'comment',
  'src',
  'author',
  'keywords',
  'copyright',
  'link',
  'sym',
  'type',
  'phone',
  'email',
  'address',
]);

function scrubProperties(value: unknown, options: GeoAnonymizeOptions): unknown {
  if (!isRecord(value)) return value;
  if (!options.stripMetadata && !options.stripTime && !options.stripElevation) return value;
  const next: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    const lower = key.toLowerCase();
    if (options.stripTime && (lower === 'time' || lower === 'timestamp' || lower.endsWith('time'))) continue;
    if (options.stripElevation && (lower === 'ele' || lower === 'elevation' || lower === 'alt' || lower === 'altitude')) {
      continue;
    }
    if (options.stripMetadata && META_KEYS.has(lower) && lower !== 'type') continue;
    next[key] = child;
  }
  return next;
}

function anonymizeGeoJson(input: string, options: GeoAnonymizeOptions): GeoAnonymizeResult {
  const parsed: unknown = JSON.parse(input);
  const counter = {points: 0};

  const walk = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(walk);
    if (!isRecord(node)) return node;
    const next: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(node)) {
      if (key === 'coordinates') {
        next[key] = walkCoords(child, options, counter);
      } else if (key === 'properties' && isRecord(child)) {
        next[key] = scrubProperties(child, options);
      } else {
        next[key] = walk(child);
      }
    }
    return next;
  };

  const output = `${JSON.stringify(walk(parsed), null, 2)}\n`;
  return {
    output,
    format: 'geojson',
    points: counter.points,
    note: summarize(counter.points, options, 'GeoJSON'),
  };
}

function replaceLatLon(chunk: string, options: GeoAnonymizeOptions, counter: {points: number}): string {
  const latMatch = chunk.match(/\blat\s*=\s*["'](-?\d+(?:\.\d+)?)["']/i);
  const lonMatch = chunk.match(/\blon\s*=\s*["'](-?\d+(?:\.\d+)?)["']/i);
  if (!latMatch || !lonMatch) return chunk;
  const [nextLat, nextLon] = shiftCoordinate(
    Number(latMatch[1]),
    Number(lonMatch[1]),
    options.noiseMeters,
    options.decimalPlaces,
  );
  counter.points += 1;
  return chunk
    .replace(latMatch[0], `lat="${nextLat}"`)
    .replace(lonMatch[0], `lon="${nextLon}"`);
}

function stripGpxTags(xml: string, tag: string): string {
  return xml.replace(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi'), '');
}

function anonymizeGpx(input: string, options: GeoAnonymizeOptions): GeoAnonymizeResult {
  const counter = {points: 0};
  let output = input.replace(/<((?:trkpt|wpt|rtept)\b)([^>]*)>/gi, (_all, tag: string, attrs: string) => {
    return `<${tag}${replaceLatLon(attrs, options, counter)}>`;
  });

  if (options.stripTime) output = stripGpxTags(output, 'time');
  if (options.stripElevation) output = stripGpxTags(output, 'ele');
  if (options.stripMetadata) {
    for (const tag of ['name', 'desc', 'cmt', 'src', 'author', 'copyright', 'keywords', 'link', 'email', 'phone', 'type', 'sym']) {
      output = stripGpxTags(output, tag);
    }
    output = output.replace(/<metadata\b[^>]*>[\s\S]*?<\/metadata>/gi, '<metadata></metadata>');
  }

  return {
    output,
    format: 'gpx',
    points: counter.points,
    note: summarize(counter.points, options, 'GPX'),
  };
}

function summarize(points: number, options: GeoAnonymizeOptions, format: string): string {
  const parts = [`${points} point${points === 1 ? '' : 's'} in ${format}`];
  if (options.noiseMeters > 0) parts.push(`~${options.noiseMeters} m noise`);
  parts.push(`${options.decimalPlaces} decimal place${options.decimalPlaces === 1 ? '' : 's'}`);
  if (options.stripTime) parts.push('timestamps removed');
  if (options.stripElevation) parts.push('elevation removed');
  if (options.stripMetadata) parts.push('names/metadata removed');
  return parts.join(' · ');
}

export function anonymizeGeo(input: string, options: GeoAnonymizeOptions = DEFAULT_GEO_OPTIONS): GeoAnonymizeResult {
  const format = detectGeoFormat(input);
  if (format === 'geojson') return anonymizeGeoJson(input, options);
  if (format === 'gpx') return anonymizeGpx(input, options);
  throw new Error('Could not detect GPX or GeoJSON. Paste a .gpx file or a Feature/FeatureCollection.');
}

export function precisionHint(decimalPlaces: number): string {
  switch (Math.max(0, Math.min(6, Math.floor(decimalPlaces)))) {
    case 0:
      return '~111 km';
    case 1:
      return '~11 km';
    case 2:
      return '~1.1 km';
    case 3:
      return '~110 m';
    case 4:
      return '~11 m';
    case 5:
      return '~1.1 m';
    default:
      return '~0.11 m';
  }
}
