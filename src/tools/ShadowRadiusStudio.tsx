import { useMemo, useState } from 'react';
import { VStack, HStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { Slider } from '@astryxdesign/core/Slider';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Switch } from '@astryxdesign/core/Switch';
import { Button } from '@astryxdesign/core/Button';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { CopyButton } from '../components/CopyButton';
import { buildShadowCss, buildRadiusCss, defaultShadow, type ShadowConfig } from '../lib/shadow';

export default function ShadowRadiusStudio() {
  const [shadows, setShadows] = useState<ShadowConfig[]>([defaultShadow()]);
  const [radius, setRadius] = useState({ tl: 12, tr: 12, br: 12, bl: 12 });
  const [bg, setBg] = useState('#ffffff');

  const shadowCss = useMemo(() => buildShadowCss(shadows), [shadows]);
  const radiusCss = useMemo(() => buildRadiusCss(radius), [radius]);

  const updateShadow = (idx: number, patch: Partial<ShadowConfig>) => {
    setShadows(prev => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };
  const addShadow = () => {
    if (shadows.length >= 3) return;
    setShadows(prev => [...prev, { ...defaultShadow(), x: 0, y: 4, blur: 12, color: 'rgba(0,0,0,0.08)' }]);
  };
  const removeShadow = (idx: number) => {
    if (shadows.length <= 1) return;
    setShadows(prev => prev.filter((_, i) => i !== idx));
  };

  return (
    <VStack gap={4}>
      <Text type="supporting" display="block">
        Craft box-shadow and border-radius live with sliders — preview and copy CSS. All local, no design-token cloud.
      </Text>

      <VStack gap={2}>
        <Text weight="semibold" display="block">Preview</Text>
        <div style={{ padding: 32, background: '#f3f4f6', borderRadius: 'var(--radius-container)', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 220, height: 140, background: bg, boxShadow: shadowCss, borderRadius: radiusCss, border: '1px solid var(--color-border)' }} />
        </div>
        <HStack gap={2} wrap="wrap">
          <TextInput label="Card bg" value={bg} onChange={setBg} width="140px" />
          <input type="color" value={bg} onChange={e => setBg(e.target.value)} style={{ width: 44, height: 36, borderRadius: 'var(--radius-control)', border: '1px solid var(--color-border)' }} />
        </HStack>
        <CodeBlock code={`box-shadow: ${shadowCss};\nborder-radius: ${radiusCss};`} language="css" width="100%" isWrapped hasCopyButton />
      </VStack>

      <VStack gap={3}>
        <HStack gap={2} vAlign="center">
          <Text weight="semibold" display="block">Shadows — {shadows.length}</Text>
          <Button label="Add shadow" variant="secondary" onClick={addShadow} isDisabled={shadows.length >= 3} />
          <CopyButton value={shadowCss} />
        </HStack>
        {shadows.map((s, i) => (
          <VStack key={i} gap={2}>
            <HStack gap={3} wrap="wrap" vAlign="end">
              <TextInput label="Color" value={s.color} onChange={(v: string) => updateShadow(i, { color: v })} width="180px" />
              <Switch label="Inset" value={s.inset} onChange={(v: boolean) => updateShadow(i, { inset: v })} />
              <Button label="Remove" variant="secondary" onClick={() => removeShadow(i)} isDisabled={shadows.length <= 1} />
            </HStack>
            <Slider label={`X ${s.x}`} min={-40} max={40} value={s.x} onChange={(v: number) => updateShadow(i, { x: v })} />
            <Slider label={`Y ${s.y}`} min={-40} max={40} value={s.y} onChange={(v: number) => updateShadow(i, { y: v })} />
            <Slider label={`Blur ${s.blur}`} min={0} max={64} value={s.blur} onChange={(v: number) => updateShadow(i, { blur: v })} />
            <Slider label={`Spread ${s.spread}`} min={-20} max={20} value={s.spread} onChange={(v: number) => updateShadow(i, { spread: v })} />
          </VStack>
        ))}
      </VStack>

      <VStack gap={3}>
        <Text weight="semibold" display="block">Border radius</Text>
        <HStack gap={3} wrap="wrap">
          <Slider label={`TL ${radius.tl}`} min={0} max={48} value={radius.tl} onChange={(v: number) => setRadius(r => ({ ...r, tl: v }))} />
          <Slider label={`TR ${radius.tr}`} min={0} max={48} value={radius.tr} onChange={(v: number) => setRadius(r => ({ ...r, tr: v }))} />
          <Slider label={`BR ${radius.br}`} min={0} max={48} value={radius.br} onChange={(v: number) => setRadius(r => ({ ...r, br: v }))} />
          <Slider label={`BL ${radius.bl}`} min={0} max={48} value={radius.bl} onChange={(v: number) => setRadius(r => ({ ...r, bl: v }))} />
          <CopyButton value={radiusCss} />
        </HStack>
      </VStack>
    </VStack>
  );
}
