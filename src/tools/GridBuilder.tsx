import { useMemo, useState } from 'react';
import { VStack, HStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Slider } from '@astryxdesign/core/Slider';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { CopyButton } from '../components/CopyButton';
import { buildGridCss } from '../lib/grid';

export default function GridBuilder() {
  const [cols, setCols] = useState(3);
  const [rows, setRows] = useState(2);
  const [colGap, setColGap] = useState(16);
  const [rowGap, setRowGap] = useState(16);
  const [colTemplate, setColTemplate] = useState('');
  const [rowTemplate, setRowTemplate] = useState('');

  const css = useMemo(() => buildGridCss({ columns: cols, rows, colGap, rowGap, colTemplate, rowTemplate }), [cols, rows, colGap, rowGap, colTemplate, rowTemplate]);
  const cells = cols * rows;

  return (
    <VStack gap={4}>
      <Text type="supporting" display="block">
        Build CSS Grid visually — columns, rows, gaps, and templates — preview and copy. Offline, no layout cloud.
      </Text>

      <HStack gap={3} wrap="wrap" vAlign="end">
        <Slider label={`Columns ${cols}`} min={1} max={12} value={cols} onChange={setCols} />
        <Slider label={`Rows ${rows}`} min={1} max={6} value={rows} onChange={setRows} />
        <Slider label={`Col gap ${colGap}px`} min={0} max={40} value={colGap} onChange={setColGap} />
        <Slider label={`Row gap ${rowGap}px`} min={0} max={40} value={rowGap} onChange={setRowGap} />
        <CopyButton value={css} />
      </HStack>

      <HStack gap={3} wrap="wrap">
        <TextInput label="grid-template-columns (override)" placeholder="repeat(12, 1fr) or 1fr 2fr" value={colTemplate} onChange={setColTemplate} width="280px" />
        <TextInput label="grid-template-rows (override)" placeholder="auto" value={rowTemplate} onChange={setRowTemplate} width="200px" />
      </HStack>

      <VStack gap={2}>
        <Text weight="semibold" display="block">Preview — {cells} cells</Text>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: colTemplate.trim() || `repeat(${cols}, 1fr)`,
            gridTemplateRows: rowTemplate.trim() || `repeat(${rows}, 60px)`,
            gap: `${rowGap}px ${colGap}px`,
            padding: 12,
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-container)',
            background: 'var(--color-background-muted)',
          }}
        >
          {Array.from({ length: cells }).map((_, i) => (
            <div key={i} style={{ background: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-control)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, height: 60 }}>{i + 1}</div>
          ))}
        </div>
      </VStack>

      <CodeBlock code={`.grid {\n  ${css.split('\n').join('\n  ')}\n}`} language="css" width="100%" isWrapped hasCopyButton />
      <CodeBlock code={`<div class="grid">\n${Array.from({ length: cells }).map((_, i) => `  <div>${i + 1}</div>`).join('\n')}\n</div>`} language="html" width="100%" isWrapped hasCopyButton />
    </VStack>
  );
}
