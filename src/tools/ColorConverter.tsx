import {useEffect, useMemo, useState} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {TextInput} from '@astryxdesign/core/TextInput';
import {Text} from '@astryxdesign/core/Text';
import {Center} from '@astryxdesign/core/Center';
import {Button} from '@astryxdesign/core/Button';
import {Slider} from '@astryxdesign/core/Slider';
import {Card} from '@astryxdesign/core/Card';
import {Grid} from '@astryxdesign/core/Grid';
import {Token} from '@astryxdesign/core/Token';
import {Banner} from '@astryxdesign/core/Banner';
import {Divider} from '@astryxdesign/core/Divider';
import {OutputRow} from '../components/OutputRow';

interface Color {
  r: number;
  g: number;
  b: number;
}

interface Hsl {
  h: number;
  s: number;
  l: number;
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
    const full = hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex;
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
  const {h, s, l} = rgbToHsl(color);
  return `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`;
}

function rgbToHsl({r, g, b}: Color): Hsl {
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
    h *= 60;
  }
  return {h: Math.round(h) % 360, s: Math.round(s * 100), l: Math.round(l * 100)};
}

function hslToRgb(h: number, s: number, l: number): Color {
  const hn = ((h % 360) + 360) % 360 / 360;
  const sn = clamp(s, 0, 100) / 100;
  const ln = clamp(l, 0, 100) / 100;
  if (sn === 0) {
    const gray = Math.round(ln * 255);
    return {r: gray, g: gray, b: gray};
  }
  const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn;
  const p = 2 * ln - q;
  const hueToRgb = (pp: number, qq: number, t: number): number => {
    let x = t;
    if (x < 0) x += 1;
    if (x > 1) x -= 1;
    if (x < 1 / 6) return pp + (qq - pp) * 6 * x;
    if (x < 1 / 2) return qq;
    if (x < 2 / 3) return pp + (qq - pp) * (2 / 3 - x) * 6;
    return pp;
  };
  return {
    r: Math.round(hueToRgb(p, q, hn + 1 / 3) * 255),
    g: Math.round(hueToRgb(p, q, hn) * 255),
    b: Math.round(hueToRgb(p, q, hn - 1 / 3) * 255),
  };
}

function relativeLuminance({r, g, b}: Color): number {
  const toLinear = (v: number): number => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function contrastRatio(a: Color, b: Color): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

const PRESET_PALETTE = [
  '#000000', '#ffffff', '#ff3b30', '#ff9500', '#ffcc02', '#4cd964',
  '#5ac8fa', '#007aff', '#5856d6', '#af52de', '#ff2d55', '#8e8e93',
  '#1f6feb', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6',
  '#8b5cf6', '#ec4899', '#a3a3a3', '#737373', '#404040', '#171717',
];

const RECENT_LIMIT = 12;

export default function ColorConverter() {
  const initial = useMemo(() => parseColor('#1f6feb') ?? {r: 31, g: 111, b: 235}, []);
  const [color, setColor] = useState<Color>(initial);
  const [raw, setRaw] = useState('#1f6feb');
  const [recent, setRecent] = useState<string[]>(['#1f6feb']);
  const [eyeDropperSupported, setEyeDropperSupported] = useState(false);
  const [eyeDropperError, setEyeDropperError] = useState<string | null>(null);

  useEffect(() => {
    setEyeDropperSupported(typeof window !== 'undefined' && 'EyeDropper' in window);
  }, []);

  const hsl = useMemo(() => rgbToHsl(color), [color]);
  const hex = useMemo(() => toHex(color), [color]);

  const pushRecent = (h: string) => {
    setRecent(prev => {
      const next = [h, ...prev.filter(c => c !== h)];
      return next.slice(0, RECENT_LIMIT);
    });
  };

  const updateFromColor = (next: Color) => {
    const clamped: Color = {
      r: clamp(Math.round(next.r), 0, 255),
      g: clamp(Math.round(next.g), 0, 255),
      b: clamp(Math.round(next.b), 0, 255),
    };
    setColor(clamped);
    const nextHex = toHex(clamped);
    setRaw(nextHex);
    pushRecent(nextHex);
  };

  const handleRawChange = (value: string) => {
    setRaw(value);
    const parsed = parseColor(value);
    if (parsed) {
      setColor(parsed);
      pushRecent(toHex(parsed));
    }
  };

  const handleNativePicker = (value: string) => {
    const parsed = parseColor(value);
    if (parsed) updateFromColor(parsed);
    else setRaw(value);
  };

  const handleEyeDropper = async () => {
    setEyeDropperError(null);
    try {
      // @ts-expect-error - EyeDropper is not in lib.dom yet in all TS versions
      const dropper = new window.EyeDropper();
      const result: {sRGBHex: string} = await dropper.open();
      if (result?.sRGBHex) {
        handleNativePicker(result.sRGBHex);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'EyeDropper was cancelled or not supported';
      if (!String(msg).toLowerCase().includes('abort') && !String(msg).toLowerCase().includes('cancel')) {
        setEyeDropperError(msg);
      }
    }
  };

  const invalid = raw.trim() !== '' && parseColor(raw) === null;

  const harmonies = useMemo(() => {
    const h = hsl.h;
    const s = hsl.s;
    const l = hsl.l;
    const complementary = hslToRgb((h + 180) % 360, s, l);
    const analogous1 = hslToRgb((h + 30) % 360, s, l);
    const analogous2 = hslToRgb((h + 330) % 360, s, l);
    const triadic1 = hslToRgb((h + 120) % 360, s, l);
    const triadic2 = hslToRgb((h + 240) % 360, s, l);
    return {complementary, analogous1, analogous2, triadic1, triadic2};
  }, [hsl]);

  const white: Color = {r: 255, g: 255, b: 255};
  const black: Color = {r: 0, g: 0, b: 0};
  const contrastWhite = contrastRatio(color, white).toFixed(2);
  const contrastBlack = contrastRatio(color, black).toFixed(2);
  const wcagWhite = Number(contrastWhite) >= 4.5 ? 'AA pass' : 'fail';
  const wcagBlack = Number(contrastBlack) >= 4.5 ? 'AA pass' : 'fail';

  const formats = [
    {label: 'HEX', value: hex},
    {label: 'RGB', value: toRgbString(color)},
    {label: 'HSL', value: toHslString(color)},
    {label: 'HEX (no hash)', value: hex.slice(1)},
  ];

  return (
    <VStack gap={5}>
      <HStack gap={3} vAlign="end" wrap="wrap">
        <TextInput
          label="Color"
          description="Accepts HEX (#1f6feb), rgb(31, 111, 235) and hsl(214, 84%, 52%). Pick visually below."
          placeholder="#1f6feb"
          value={raw}
          onChange={handleRawChange}
          hasClear
          width="320px"
          status={invalid ? {type: 'error' as const, message: 'Not a recognized HEX, RGB or HSL color.'} : undefined}
        />
        <VStack gap={1}>
          <Text type="label" display="block">
            Picker
          </Text>
          <HStack gap={2} vAlign="center">
            <input
              aria-label="Pick color"
              type="color"
              value={hex}
              onChange={e => handleNativePicker(e.target.value)}
              style={{
                width: 44,
                height: 36,
                padding: 0,
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-control)',
                background: 'var(--color-background)',
                cursor: 'pointer',
              }}
            />
            <Button
              label="Copy HEX"
              variant="secondary"
              onClick={() => void navigator.clipboard.writeText(hex)}
            />
          </HStack>
        </VStack>
        {eyeDropperSupported && (
          <Button label="Pick from screen" variant="secondary" onClick={() => void handleEyeDropper()} />
        )}
      </HStack>

      {eyeDropperError && <Banner status="error" title="EyeDropper failed" description={eyeDropperError} />}

      <Card padding={4} variant="muted">
        <HStack gap={4} vAlign="center" wrap="wrap">
          <Center
            width="var(--spacing-12)"
            height="var(--spacing-12)"
            style={{
              borderRadius: 'var(--radius-container)',
              border: '1px solid var(--color-border)',
              backgroundColor: hex,
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
              {hex} - {toRgbString(color)} - {toHslString(color)}
            </Text>
            <HStack gap={2} wrap="wrap">
              <Token label={`Contrast white: ${contrastWhite} (${wcagWhite})`} size="sm" color={wcagWhite === 'AA pass' ? 'green' : 'red'} />
              <Token label={`Contrast black: ${contrastBlack} (${wcagBlack})`} size="sm" color={wcagBlack === 'AA pass' ? 'green' : 'red'} />
            </HStack>
          </VStack>
          <HStack gap={2} wrap="wrap">
            <Center width="48px" height="48px" style={{backgroundColor: hex, borderRadius: 'var(--radius-control)', border: '1px solid var(--color-border)'}}>{'\u00a0'}</Center>
            <Center width="48px" height="48px" style={{backgroundColor: toHex(harmonies.complementary), borderRadius: 'var(--radius-control)', border: '1px solid var(--color-border)'}}>{'\u00a0'}</Center>
          </HStack>
        </HStack>
      </Card>

      <VStack gap={3}>
        <Text weight="semibold" display="block">
          RGB
        </Text>
        <Slider label="Red" min={0} max={255} value={color.r} onChange={(v: number) => updateFromColor({...color, r: v})} />
        <Slider label="Green" min={0} max={255} value={color.g} onChange={(v: number) => updateFromColor({...color, g: v})} />
        <Slider label="Blue" min={0} max={255} value={color.b} onChange={(v: number) => updateFromColor({...color, b: v})} />
      </VStack>

      <VStack gap={3}>
        <Text weight="semibold" display="block">
          HSL
        </Text>
        <Slider label="Hue" min={0} max={360} value={hsl.h} onChange={(v: number) => updateFromColor(hslToRgb(v, hsl.s, hsl.l))} />
        <Slider label="Saturation" min={0} max={100} value={hsl.s} onChange={(v: number) => updateFromColor(hslToRgb(hsl.h, v, hsl.l))} />
        <Slider label="Lightness" min={0} max={100} value={hsl.l} onChange={(v: number) => updateFromColor(hslToRgb(hsl.h, hsl.s, v))} />
      </VStack>

      <VStack gap={2}>
        <Text weight="semibold" display="block">
          Palette
        </Text>
        <Text type="supporting" display="block">
          Click to pick. All local, no upload.
        </Text>
        <Grid columns={{minWidth: 44}} gap={2} width="100%">
          {PRESET_PALETTE.map(c => (
            <button
              key={c}
              aria-label={`Pick ${c}`}
              onClick={() => handleNativePicker(c)}
              style={{
                width: 44,
                height: 32,
                borderRadius: 'var(--radius-control)',
                border: c.toLowerCase() === hex.toLowerCase() ? '2px solid var(--color-foreground)' : '1px solid var(--color-border)',
                backgroundColor: c,
                cursor: 'pointer',
              }}
            />
          ))}
        </Grid>
      </VStack>

      {recent.length > 0 && (
        <VStack gap={2}>
          <Text weight="semibold" display="block">
            Recent
          </Text>
          <HStack gap={2} wrap="wrap">
            {recent.map(c => (
              <button
                key={c}
                aria-label={`Pick recent ${c}`}
                onClick={() => handleNativePicker(c)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 'var(--radius-control)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: c,
                  cursor: 'pointer',
                }}
              />
            ))}
            <Button label="Clear" variant="secondary" onClick={() => setRecent([])} />
          </HStack>
        </VStack>
      )}

      <VStack gap={2}>
        <Text weight="semibold" display="block">
          Harmonies
        </Text>
        <Grid columns={{minWidth: 140}} gap={3} width="100%">
          <Card padding={3} variant="muted">
            <VStack gap={2}>
              <Text type="label" display="block">Complementary</Text>
              <Center height="40px" style={{backgroundColor: toHex(harmonies.complementary), borderRadius: 'var(--radius-control)', border: '1px solid var(--color-border)'}}>{'\u00a0'}</Center>
              <OutputRow label="HEX" value={toHex(harmonies.complementary)} />
            </VStack>
          </Card>
          <Card padding={3} variant="muted">
            <VStack gap={2}>
              <Text type="label" display="block">Analogous</Text>
              <HStack gap={2}>
                <Center width="50%" height="40px" style={{backgroundColor: toHex(harmonies.analogous1), borderRadius: 'var(--radius-control)', border: '1px solid var(--color-border)'}}>{'\u00a0'}</Center>
                <Center width="50%" height="40px" style={{backgroundColor: toHex(harmonies.analogous2), borderRadius: 'var(--radius-control)', border: '1px solid var(--color-border)'}}>{'\u00a0'}</Center>
              </HStack>
              <OutputRow label="A" value={toHex(harmonies.analogous1)} />
              <OutputRow label="B" value={toHex(harmonies.analogous2)} />
            </VStack>
          </Card>
          <Card padding={3} variant="muted">
            <VStack gap={2}>
              <Text type="label" display="block">Triadic</Text>
              <HStack gap={2}>
                <Center width="50%" height="40px" style={{backgroundColor: toHex(harmonies.triadic1), borderRadius: 'var(--radius-control)', border: '1px solid var(--color-border)'}}>{'\u00a0'}</Center>
                <Center width="50%" height="40px" style={{backgroundColor: toHex(harmonies.triadic2), borderRadius: 'var(--radius-control)', border: '1px solid var(--color-border)'}}>{'\u00a0'}</Center>
              </HStack>
              <OutputRow label="A" value={toHex(harmonies.triadic1)} />
              <OutputRow label="B" value={toHex(harmonies.triadic2)} />
            </VStack>
          </Card>
        </Grid>
      </VStack>

      <Divider />

      <VStack gap={3}>
        <Text weight="semibold" display="block">
          Formats
        </Text>
        {formats.map(f => (
          <OutputRow key={f.label} label={f.label} value={f.value} />
        ))}
        <OutputRow label="CSS var" value={`--color: ${hex};`} />
      </VStack>
    </VStack>
  );
}
