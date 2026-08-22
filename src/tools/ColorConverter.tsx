import {useMemo, useState} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {TextInput} from '@astryxdesign/core/TextInput';
import {Text} from '@astryxdesign/core/Text';
import {Center} from '@astryxdesign/core/Center';
import {OutputRow} from '../components/OutputRow';

interface Color {
  r: number;
  g: number;
  b: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function parseColor(raw: string): Color | null {
  const input = raw.trim().toLowerCase();
  if (input === '') return null;

  const hexMatch = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/.exec(input);
  if (hexMatch) {
    const hex = hexMatch[1];
    const full =
      hex.length === 3
        ? hex.split('').map(c => c + c).join('')
        : hex;
    return {
      r: parseInt(full.slice(0, 2), 16),
      g: parseInt(full.slice(2, 4), 16),
      b: parseInt(full.slice(4, 6), 16),
    };
  }

  const rgbMatch = /^rgba?\(\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})/.exec(input);
  if (rgbMatch) {
    return {
      r: clamp(Number(rgbMatch[1]), 0, 255),
      g: clamp(Number(rgbMatch[2]), 0, 255),
      b: clamp(Number(rgbMatch[3]), 0, 255),
    };
  }

  const hslMatch = /^hsla?\(\s*([\d.]+)(?:deg)?\s*[,\s]\s*([\d.]+)%\s*[,\s]\s*([\d.]+)%/.exec(input);
  if (hslMatch) {
    const h = Number(hslMatch[1]) / 360;
    const s = Number(hslMatch[2]) / 100;
    const l = Number(hslMatch[3]) / 100;
    const hueToRgb = (p: number, q: number, t: number): number => {
      let x = t;
      if (x < 0) x += 1;
      if (x > 1) x -= 1;
      if (x < 1 / 6) return p + (q - p) * 6 * x;
      if (x < 1 / 2) return q;
      if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
      return p;
    };
    if (s === 0) {
      const gray = Math.round(l * 255);
      return {r: gray, g: gray, b: gray};
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    return {
      r: Math.round(hueToRgb(p, q, h + 1 / 3) * 255),
      g: Math.round(hueToRgb(p, q, h) * 255),
      b: Math.round(hueToRgb(p, q, h - 1 / 3) * 255),
    };
  }

  return null;
}

function toHex({r, g, b}: Color): string {
  return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`;
}

function toRgbString({r, g, b}: Color): string {
  return `rgb(${r}, ${g}, ${b})`;
}

function toHslString(color: Color): string {
  const {r, g, b} = color;
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      default:
        h = (rn - gn) / d + 4;
    }
    h /= 6;
  }
  return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
}

export default function ColorConverter() {
  const [raw, setRaw] = useState('#1f6feb');

  const parsed = useMemo(() => parseColor(raw), [raw]);
  const invalid = raw.trim() !== '' && parsed === null;

  const formats = parsed
    ? [
        {label: 'HEX', value: toHex(parsed)},
        {label: 'RGB', value: toRgbString(parsed)},
        {label: 'HSL', value: toHslString(parsed)},
      ]
    : [];

  return (
    <VStack gap={5}>
      <TextInput
        label="Color"
        description="Accepts HEX (#1f6feb), rgb(31, 111, 235) and hsl(214, 84%, 52%)."
        placeholder="#1f6feb"
        value={raw}
        onChange={setRaw}
        hasClear
        status={
          invalid
            ? {type: 'error' as const, message: 'Not a recognized HEX, RGB or HSL color.'}
            : undefined
        }
      />

      {parsed && (
        <VStack gap={4}>
          <HStack gap={4} vAlign="center">
            <Center
              width="var(--spacing-12)"
              height="var(--spacing-12)"
              style={{
                borderRadius: 'var(--radius-container)',
                border: '1px solid var(--color-border)',
                backgroundColor: toHex(parsed),
                flexShrink: 0,
              }}
            >
              {'\u00a0'}
            </Center>
            <VStack gap={1}>
              <Text type="supporting" display="block">
                Live preview
              </Text>
              <Text weight="semibold" display="block">
                {toHex(parsed)}
              </Text>
            </VStack>
          </HStack>

          <VStack gap={3}>
            {formats.map(f => (
              <OutputRow key={f.label} label={f.label} value={f.value} />
            ))}
          </VStack>
        </VStack>
      )}
    </VStack>
  );
}
