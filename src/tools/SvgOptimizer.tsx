import { useMemo, useState } from 'react';
import { VStack, HStack } from '@astryxdesign/core/Layout';
import { TextArea } from '@astryxdesign/core/TextArea';
import { FileInput } from '@astryxdesign/core/FileInput';
import { Text } from '@astryxdesign/core/Text';
import { Slider } from '@astryxdesign/core/Slider';
import { Switch } from '@astryxdesign/core/Switch';
import { Banner } from '@astryxdesign/core/Banner';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { Token } from '@astryxdesign/core/Token';
import { CopyButton } from '../components/CopyButton';
import { asFile, downloadBlob, formatBytes } from '../lib/files';
import { optimizeSvg } from '../lib/svgOptimize';

export default function SvgOptimizer() {
  const [text, setText] = useState('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><!-- comment --><metadata>editor</metadata><rect width="100.12345" height="100.98765" fill="#ff0000"/></svg>');
  const [precision, setPrecision] = useState(2);
  const [removeComments, setRemoveComments] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [fileText, setFileText] = useState<string | null>(null);

  const active = fileText ?? text;
  const result = useMemo(() => {
    try {
      return { data: optimizeSvg(active, { precision, removeComments }), error: null as string | null };
    } catch (e) {
      return { data: null, error: e instanceof Error ? e.message : String(e) };
    }
  }, [active, precision, removeComments]);

  const onFile = async (v: File | File[] | null) => {
    const f = asFile(v);
    setFile(f);
    if (!f) { setFileText(null); return; }
    if (!f.name.endsWith('.svg') && f.type !== 'image/svg+xml') {
      // still allow but warn
    }
    if (f.size > 2 * 1024 * 1024) {
      setFileText('/* too large */');
      return;
    }
    const t = await f.text();
    setFileText(t);
  };

  return (
    <VStack gap={4}>
      <Text type="supporting" display="block">
        Optimize SVG locally — strip comments/metadata, round numbers, remove editor attrs, and normalize viewBox. No SVGO cloud.
      </Text>

      <TextArea label="SVG content" placeholder="<svg …>…" value={text} onChange={setText} rows={6} hasSpellCheck={false} />
      <FileInput label="Or SVG file" accept=".svg,image/svg+xml" value={file} onChange={onFile} />

      <HStack gap={3} wrap="wrap" vAlign="center">
        <Slider label={`Precision ${precision}`} min={0} max={4} value={precision} onChange={setPrecision} />
        <Switch label="Remove comments" value={removeComments} onChange={setRemoveComments} />
        {result.data && <CopyButton value={result.data.cleaned} />}
      </HStack>

      {result.error && <Banner status="error" title="Error" description={result.error} />}

      {result.data && (
        <VStack gap={3}>
          <HStack gap={2} wrap="wrap">
            <Token label={`${formatBytes(result.data.originalSize)} → ${formatBytes(result.data.optimizedSize)}`} size="sm" color={result.data.saved > 0 ? 'green' : 'orange'} />
            <Token label={`Saved ${result.data.saved} B (${result.data.savedPercent}%)`} size="sm" color={result.data.saved > 0 ? 'green' : 'orange'} />
            {result.data.removed.map(r => <Token key={r} label={r} size="sm" />)}
          </HStack>

          {result.data.warnings.map((w,i)=>(<Banner key={i} status="warning" title="Note" description={w} />))}

          <CodeBlock code={result.data.cleaned.slice(0, 8000)} language="xml" width="100%" maxHeight={360} isWrapped hasCopyButton={false} />

          <HStack gap={2}>
            <button onClick={() => downloadBlob(new Blob([result.data!.cleaned], { type: 'image/svg+xml' }), file ? file.name.replace(/\.svg$/i, '-optimized.svg') : 'optimized.svg')} style={{ padding: '8px 16px', borderRadius: 'var(--radius-control)', background: 'var(--color-background-accent)', color: 'white', border: 'none', cursor: 'pointer' }}>Download optimized.svg</button>
            <Text type="supporting" display="block">Original {formatBytes(result.data.originalSize)} → {formatBytes(result.data.optimizedSize)}</Text>
          </HStack>
        </VStack>
      )}
    </VStack>
  );
}
