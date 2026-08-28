import { useMemo, useState } from 'react';
import { VStack, HStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Slider } from '@astryxdesign/core/Slider';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import { Button } from '@astryxdesign/core/Button';
import { Banner } from '@astryxdesign/core/Banner';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { CopyButton } from '../components/CopyButton';
import { buildGradientCss, type GradientStop, type GradientType } from '../lib/gradient';

function clamp(n: number, min: number, max: number) { return Math.min(max, Math.max(min, n)); }

export default function GradientStudio() {
  const [type, setType] = useState<GradientType>('linear');
  const [angle, setAngle] = useState(90);
  const [stops, setStops] = useState<GradientStop[]>([
    { color: '#1f6feb', position: 0 },
    { color: '#ff2d55', position: 100 },
  ]);

  const css = useMemo(() => buildGradientCss({ type, angle, stops }), [type, angle, stops]);

  const updateStop = (idx: number, patch: Partial<GradientStop>) => {
    setStops(prev => prev.map((s, i) => (i === idx ? { ...s, ...patch, position: patch.position != null ? clamp(patch.position, 0, 100) : s.position } : s)).sort((a,b)=>a.position-b.position));
  };

  const addStop = () => {
    if (stops.length >= 5) return;
    const color = '#ffffff';
    const pos = stops.length === 0 ? 50 : Math.round((stops[stops.length-1].position + stops[0].position)/2);
    setStops(prev => [...prev, { color, position: clamp(pos, 0, 100) }].sort((a,b)=>a.position-b.position));
  };

  const removeStop = (idx: number) => {
    if (stops.length <= 2) return;
    setStops(prev => prev.filter((_, i) => i !== idx));
  };

  return (
    <VStack gap={4}>
      <Text type="supporting" display="block">
        Build CSS gradients live — linear, radial, conic — with preview and copy. All computed locally, no editor cloud.
      </Text>

      <HStack gap={3} wrap="wrap" vAlign="end">
        <SegmentedControl label="Type" value={type} onChange={v => setType(v as GradientType)}>
          <SegmentedControlItem value="linear" label="Linear" />
          <SegmentedControlItem value="radial" label="Radial" />
          <SegmentedControlItem value="conic" label="Conic" />
        </SegmentedControl>
        {type !== 'radial' && <Slider label={`Angle ${angle}°`} min={0} max={360} value={angle} onChange={setAngle} />}
        <Button label="Add stop" variant="secondary" onClick={addStop} />
        <CopyButton value={`background: ${css};`} label="Copy CSS" />
      </HStack>

      <VStack gap={3}>
        {stops.map((s, i) => (
          <HStack key={i} gap={3} wrap="wrap" vAlign="end">
            <TextInput label={`Stop ${i+1} color`} value={s.color} onChange={(v: string) => updateStop(i, { color: v })} width="160px" />
            <input type="color" value={s.color} onChange={e => updateStop(i, { color: e.target.value })} style={{ width: 44, height: 36, borderRadius: 'var(--radius-control)', border: '1px solid var(--color-border)' }} />
            <Slider label={`Pos ${s.position}%`} min={0} max={100} value={s.position} onChange={(v: number) => updateStop(i, { position: v })} />
            <Button label="Remove" variant="secondary" onClick={() => removeStop(i)} isDisabled={stops.length <= 2} />
          </HStack>
        ))}
      </VStack>

      <VStack gap={2}>
        <Text weight="semibold" display="block">Preview</Text>
        <div style={{ height: 140, borderRadius: 'var(--radius-container)', border: '1px solid var(--color-border)', background: css }} />
        <CodeBlock code={`background: ${css};`} language="css" width="100%" isWrapped hasCopyButton />
        <CodeBlock code={`<div style="background: ${css}"></div>`} language="html" width="100%" isWrapped hasCopyButton />
      </VStack>

      <Banner status="info" title="Tip" description="For Tailwind use bg-[linear-gradient(...)] arbitrary value. For PNG export, screenshot the preview — no server render." />
    </VStack>
  );
}
