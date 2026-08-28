import { useMemo, useState } from 'react';
import { VStack, HStack } from '@astryxdesign/core/Layout';
import { TextArea } from '@astryxdesign/core/TextArea';
import { FileInput } from '@astryxdesign/core/FileInput';
import { Text } from '@astryxdesign/core/Text';
import { Banner } from '@astryxdesign/core/Banner';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { Token } from '@astryxdesign/core/Token';
import { CopyButton } from '../components/CopyButton';
import { asFile, downloadBlob } from '../lib/files';
import { sanitizeSvg } from '../lib/svgSanitize';

export default function SvgSanitizer() {
  const [text, setText] = useState('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="red" onclick="alert(1)"/><script>alert(1)</script><foreignObject><iframe src="https://evil.com"></iframe></foreignObject></svg>');
  const [file, setFile] = useState<File | null>(null);

  const fromText = useMemo(() => {
    try {
      return { res: sanitizeSvg(text), error: null as string | null };
    } catch (e) {
      return { res: null, error: e instanceof Error ? e.message : String(e) };
    }
  }, [text]);

  const [fileRes, setFileRes] = useState<{ cleaned: string; removed: string[]; warnings: string[] } | null>(null);
  const [fileErr, setFileErr] = useState<string | null>(null);

  const onFile = async (v: File | File[] | null) => {
    const f = asFile(v);
    setFile(f);
    setFileErr(null);
    setFileRes(null);
    if (!f) return;
    try {
      const t = await f.text();
      setFileRes(sanitizeSvg(t));
    } catch (e) {
      setFileErr(e instanceof Error ? e.message : String(e));
    }
  };

  const active = file ? { res: fileRes, err: fileErr, source: file.name } : { res: fromText.res, err: fromText.error, source: 'pasted SVG' };

  return (
    <VStack gap={4}>
      <Text type="supporting" display="block">
        Sanitize SVG before sharing — removes &lt;script&gt;, foreignObject, iframes, event handlers (onload, onclick) and javascript: URLs locally via DOMParser.
      </Text>

      <TextArea label="SVG content" placeholder="<svg …>…" value={text} onChange={setText} rows={6} hasSpellCheck={false} />
      <FileInput label="Or SVG file" accept=".svg,image/svg+xml" value={file} onChange={onFile} />

      {active.err && <Banner status="error" title="Error" description={active.err} />}

      {active.res && (
        <VStack gap={3}>
          <HStack gap={2} wrap="wrap" vAlign="center">
            <Text weight="semibold" display="block">Removed: {active.res.removed.length}</Text>
            {active.res.removed.length ? <Token label="Sanitized" size="sm" color="orange" /> : <Token label="No changes" size="sm" color="green" />}
            <CopyButton value={active.res.cleaned} />
            <button
              onClick={() => downloadBlob(new Blob([active.res!.cleaned], { type: 'image/svg+xml' }), file ? file.name.replace(/\.svg$/i, '-clean.svg') : 'clean.svg')}
              style={{ padding: '6px 12px', borderRadius: 'var(--radius-control)', border: '1px solid var(--color-border)', background: 'var(--color-background)', cursor: 'pointer' }}
            >
              Download clean.svg
            </button>
          </HStack>

          {active.res.removed.length > 0 && (
            <VStack gap={1}>
              {active.res.removed.slice(0, 20).map((r, i) => (
                <Text key={i} type="supporting" display="block">• {r}</Text>
              ))}
            </VStack>
          )}

          {active.res.warnings.map((w, i) => (
            <Banner key={i} status="warning" title="Note" description={w} />
          ))}

          <CodeBlock code={active.res.cleaned.slice(0, 8000)} language="xml" width="100%" maxHeight={360} isWrapped hasCopyButton={false} />
          <Text type="supporting" display="block">Source: {active.source} — review the cleaned SVG before embedding.</Text>
        </VStack>
      )}
    </VStack>
  );
}
