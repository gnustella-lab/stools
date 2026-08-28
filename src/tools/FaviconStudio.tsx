import { useState } from 'react';
import { VStack, HStack } from '@astryxdesign/core/Layout';
import { FileInput } from '@astryxdesign/core/FileInput';
import { Text } from '@astryxdesign/core/Text';
import { Banner } from '@astryxdesign/core/Banner';
import { Token } from '@astryxdesign/core/Token';
import { CopyButton } from '../components/CopyButton';
import { asFile, downloadBlob } from '../lib/files';
import { resizeWithCanvas, pngsToIco } from '../lib/favicon';

const SIZES = [16, 32, 48, 180, 192, 512];

export default function FaviconStudio() {
  const [file, setFile] = useState<File | null>(null);
  const [previews, setPreviews] = useState<{ size: number; url: string; blob: Blob }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onFile = async (v: File | File[] | null) => {
    const f = asFile(v);
    setFile(f);
    setPreviews([]);
    setError(null);
    if (!f) return;
    if (!f.type.startsWith('image/')) { setError('Only images supported.'); return; }
    if (f.size > 8 * 1024 * 1024) { setError('Image too large (max 8 MB).'); return; }
    setLoading(true);
    try {
      const results: { size: number; url: string; blob: Blob }[] = [];
      for (const size of SIZES) {
        const blob = await resizeWithCanvas(f, size);
        const url = URL.createObjectURL(blob);
        results.push({ size, url, blob });
      }
      setPreviews(results);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const downloadPng = (size: number) => {
    const p = previews.find(p => p.size === size);
    if (p) downloadBlob(p.blob, `favicon-${size}x${size}.png`);
  };

  const downloadIco = async () => {
    try {
      const icoBlobs = previews.filter(p => [16, 32, 48].includes(p.size)).map(p => ({ blob: p.blob, size: p.size }));
      if (icoBlobs.length === 0) throw new Error('Generate sizes first.');
      const ico = await pngsToIco(icoBlobs);
      downloadBlob(ico, 'favicon.ico');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const htmlSnippet = `<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">\n<link rel="apple-touch-icon" sizes="180x180" href="/favicon-180x180.png">\n<link rel="icon" href="/favicon.ico">`;

  return (
    <VStack gap={4}>
      <Text type="supporting" display="block">
        Generate favicons and OG images from your logo locally — Canvas re-encodes to 16/32/48/180/192/512 and packs .ico without upload.
      </Text>

      <FileInput label="Logo image" description="PNG/SVG/WebP up to 8 MB. Square logos work best." accept="image/*" mode="dropzone" value={file} onChange={onFile} />

      {loading && <Banner status="info" title="Generating…" description="Re-encoding sizes via Canvas locally." />}
      {error && <Banner status="error" title="Error" description={error} />}

      {previews.length > 0 && (
        <VStack gap={3}>
          <HStack gap={2} wrap="wrap" vAlign="center">
            <Text weight="semibold" display="block">Previews — {previews.length}</Text>
            {previews.map(p => (
              <Token key={p.size} label={`${p.size}×${p.size}`} size="sm" />
            ))}
            <CopyButton value={htmlSnippet} label="Copy HTML" />
          </HStack>

          <HStack gap={3} wrap="wrap">
            {previews.map(p => (
              <VStack key={p.size} gap={1}>
                <img src={p.url} alt={`${p.size}`} width={Math.min(64, p.size)} height={Math.min(64, p.size)} style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-control)', background: 'white' }} />
                <Text type="supporting" display="block">{p.size}×{p.size}</Text>
                <button onClick={() => downloadPng(p.size)} style={{ padding: '4px 8px', borderRadius: 'var(--radius-control)', border: '1px solid var(--color-border)', background: 'var(--color-background)', cursor: 'pointer', fontSize: 12 }}>PNG</button>
              </VStack>
            ))}
          </HStack>

          <HStack gap={2} wrap="wrap">
            <button onClick={() => void downloadIco()} style={{ padding: '8px 16px', borderRadius: 'var(--radius-control)', background: 'var(--color-background-accent)', color: 'white', border: 'none', cursor: 'pointer' }}>Download favicon.ico (16/32/48)</button>
            <button onClick={() => previews.forEach(p => downloadPng(p.size))} style={{ padding: '8px 16px', borderRadius: 'var(--radius-control)', border: '1px solid var(--color-border)', background: 'var(--color-background)', cursor: 'pointer' }}>Download all PNGs</button>
          </HStack>

          <Text type="code" display="block" wordBreak="break-all">{htmlSnippet}</Text>
        </VStack>
      )}

      <Text type="supporting" display="block">Honest limits: ICO packs PNGs (modern browsers). For legacy BMP ICO, use a desktop tool. No image leaves this tab.</Text>
    </VStack>
  );
}
