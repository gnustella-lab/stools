import { useRef, useState, useCallback } from 'react';
import { VStack, HStack } from '@astryxdesign/core/Layout';
import { FileInput } from '@astryxdesign/core/FileInput';
import { Text } from '@astryxdesign/core/Text';
import { Banner } from '@astryxdesign/core/Banner';
import { Token } from '@astryxdesign/core/Token';
import { CopyButton } from '../components/CopyButton';
import { asFile } from '../lib/files';
import { extractPaletteFromCanvas, paletteToCssVars, paletteToTailwind, type PaletteColor } from '../lib/palette';
import { Center } from '@astryxdesign/core/Center';

export default function PaletteExtractor() {
  const [file, setFile] = useState<File | null>(null);
  const [palette, setPalette] = useState<PaletteColor[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, setSrc] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [loading, setLoading] = useState(false);

  const process = useCallback(async (f: File) => {
    setError(null);
    setPalette(null);
    setLoading(true);
    try {
      if (!f.type.startsWith('image/')) throw new Error('Only images supported.');
      if (f.size > 12 * 1024 * 1024) throw new Error('Image too large (max 12 MB).');
      const url = URL.createObjectURL(f);
      setSrc(url);
      const img = new Image();
      img.onload = async () => {
        imgRef.current = img;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const maxW = 320;
        const scale = Math.min(1, maxW / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        canvas.width = w;
        canvas.height = h;
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        ctx.drawImage(img, 0, 0, w, h);
        try {
          const colors = await extractPaletteFromCanvas(canvas, 6);
          setPalette(colors);
        } catch (e) {
          setError(e instanceof Error ? e.message : String(e));
        } finally {
          setLoading(false);
        }
      };
      img.onerror = () => {
        setError('Could not decode image.');
        setLoading(false);
      };
      img.src = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setLoading(false);
    }
  }, []);

  const onFile = (v: File | File[] | null) => {
    const f = asFile(v);
    setFile(f);
    if (f) void process(f);
    else {
      setPalette(null);
      setSrc(null);
      setError(null);
    }
  };

  return (
    <VStack gap={4}>
      <Text type="supporting" display="block">
        Extract dominant colors from any image locally. No upload — decoded via Canvas and clustered with k-means in this tab.
      </Text>

      <FileInput label="Image" description="PNG/JPEG/WebP up to 12 MB. Also supports paste." accept="image/*" mode="dropzone" value={file} onChange={onFile} />

      <canvas ref={canvasRef} style={{ display: file ? 'block' : 'none', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-control)', maxWidth: '100%' }} />

      {loading && <Banner status="info" title="Extracting palette…" description="Clustering pixels locally." />}
      {error && <Banner status="error" title="Error" description={error} />}

      {palette && (
        <VStack gap={3}>
          <Text weight="semibold" display="block">Palette — {palette.length} colors</Text>
          <HStack gap={2} wrap="wrap">
            {palette.map((c, i) => (
              <VStack key={c.hex + i} gap={1}>
                <Center width="64px" height="64px" style={{ background: c.hex, borderRadius: 'var(--radius-control)', border: '1px solid var(--color-border)' }}>{'\u00a0'}</Center>
                <Text type="code" display="block">{c.hex}</Text>
                <Text type="supporting" display="block">{c.percentage}%</Text>
                <CopyButton value={c.hex} label="Copy" />
              </VStack>
            ))}
          </HStack>

          <VStack gap={2}>
            <HStack gap={2} vAlign="center">
              <Text weight="semibold" display="block">CSS vars</Text>
              <CopyButton value={paletteToCssVars(palette)} />
            </HStack>
            <Text type="code" display="block" wordBreak="break-all">{paletteToCssVars(palette)}</Text>
          </VStack>

          <VStack gap={2}>
            <HStack gap={2} vAlign="center">
              <Text weight="semibold" display="block">Tailwind</Text>
              <CopyButton value={paletteToTailwind(palette)} />
            </HStack>
            <Text type="code" display="block" wordBreak="break-all">{paletteToTailwind(palette)}</Text>
          </VStack>

          <HStack gap={2} wrap="wrap">
            {palette.map(c => (
              <Token key={c.hex} label={`${c.hex} ${c.percentage}%`} size="sm" />
            ))}
          </HStack>
        </VStack>
      )}

      <Text type="supporting" display="block">Honest limits: k-means approximation — count/percent are samples, not exact palette. For print accuracy use a colorimeter.</Text>
    </VStack>
  );
}
