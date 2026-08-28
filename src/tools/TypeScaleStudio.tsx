import { useMemo, useState } from 'react';
import { VStack, HStack } from '@astryxdesign/core/Layout';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Text } from '@astryxdesign/core/Text';
import { Slider } from '@astryxdesign/core/Slider';
import { Banner } from '@astryxdesign/core/Banner';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { Token } from '@astryxdesign/core/Token';
import { CopyButton } from '../components/CopyButton';
import { RATIOS, buildScaleTable, cssVarsForScale } from '../lib/typography';

export default function TypeScaleStudio() {
  const [base, setBase] = useState(16);
  const [ratioKey, setRatioKey] = useState('Major Third (1.25)');
  const ratio = RATIOS[ratioKey] ?? 1.25;
  const [stepsStr, setStepsStr] = useState('-1,0,1,2,3,4,5');

  const steps = useMemo(() => stepsStr.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n)), [stepsStr]);
  const table = useMemo(() => buildScaleTable({ base, ratio, steps }), [base, ratio, steps]);
  const cssVars = useMemo(() => cssVarsForScale(table), [table]);

  return (
    <VStack gap={4}>
      <Text type="supporting" display="block">
        Build a modular type scale and fluid clamp() locally. Preview sizes and copy CSS vars — no external type-scale service.
      </Text>

      <HStack gap={3} wrap="wrap" vAlign="end">
        <Slider label={`Base ${base}px`} min={12} max={20} value={base} onChange={setBase} />
        <VStack gap={1}>
          <Text type="label" display="block">Ratio</Text>
          <select value={ratioKey} onChange={e => setRatioKey(e.target.value)} style={{ padding: '8px', borderRadius: 'var(--radius-control)', border: '1px solid var(--color-border)' }}>
            {Object.keys(RATIOS).map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </VStack>
        <TextInput label="Steps (comma)" value={stepsStr} onChange={setStepsStr} width="180px" />
        <CopyButton value={cssVars} label="Copy vars" />
      </HStack>

      <VStack gap={2}>
        <Text weight="semibold" display="block">Scale — base {base}px × {ratioKey}</Text>
        {table.map(t => (
          <HStack key={t.step} gap={3} wrap="wrap" vAlign="center">
            <Token label={`step ${t.step}`} size="sm" />
            <Text type="code" display="block">{t.px}px / {t.rem}rem</Text>
            <Text type="code" display="block" wordBreak="break-all">{t.clamp}</Text>
            <CopyButton value={t.clamp} />
            <div style={{ fontSize: `${t.px}px`, lineHeight: 1.2, border: '1px solid var(--color-border)', padding: '4px 8px', borderRadius: 'var(--radius-control)', background: 'var(--color-background-muted)' }}>Aa {t.px}px</div>
          </HStack>
        ))}
      </VStack>

      <VStack gap={2}>
        <Text weight="semibold" display="block">CSS vars</Text>
        <CodeBlock code={`:root {\n${cssVars}\n}`} language="css" width="100%" isWrapped hasCopyButton />
        <CodeBlock code={table.map(t => `.text-${t.step} { font-size: ${t.clamp}; }`).join('\n')} language="css" width="100%" isWrapped hasCopyButton />
      </VStack>

      <Banner status="info" title="Tip" description="clamp() fluid is 0.9× to 1.1× of step size between 320–1280vw. Adjust per your breakpoints." />
    </VStack>
  );
}
