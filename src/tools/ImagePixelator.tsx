import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {FileInput} from '@astryxdesign/core/FileInput';
import {Button} from '@astryxdesign/core/Button';
import {Text} from '@astryxdesign/core/Text';
import {Banner} from '@astryxdesign/core/Banner';
import {Slider} from '@astryxdesign/core/Slider';
import {Icon} from '@astryxdesign/core/Icon';
import {StatusDot} from '@astryxdesign/core/StatusDot';
import {pixelateRegion, loadBitmap, bitmapSize} from '../lib/pixelate';
import {asFile, downloadBlob, formatBytes} from '../lib/files';

interface Rect {
  startX: number;
  startY: number;
  x: number;
  y: number;
}

/** Selection stored in canvas pixels; converted to image fractions for export. */
function toFractions(rect: Rect, canvasWidth: number, canvasHeight: number) {
  const left = Math.min(rect.startX, rect.x) / canvasWidth;
  const top = Math.min(rect.startY, rect.y) / canvasHeight;
  const width = Math.abs(rect.x - rect.startX) / canvasWidth;
  const height = Math.abs(rect.y - rect.startY) / canvasHeight;
  return {x: left, y: top, width, height};
}

export default function ImagePixelator() {
  const [file, setFile] = useState<File | null>(null);
  const [dims, setDims] = useState<{width: number; height: number} | null>(null);
  const [blockSize, setBlockSize] = useState(24);
  const [rect, setRect] = useState<Rect | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const previewRef = useRef<HTMLCanvasElement | null>(null);
  const bmpRef = useRef<ImageBitmap | HTMLImageElement | null>(null);

  // Decode the image once per file selection.
  useEffect(() => {
    if (!file) {
      bmpRef.current = null;
      setDims(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const bmp = await loadBitmap(file);
        if (cancelled) return;
        bmpRef.current = bmp;
        setDims(bitmapSize(bmp));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not read this image.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file]);

  // Paint the preview and the selection overlay. Runs after every relevant
  // state change; the canvas exists by then because it renders when both
  // `file` and `dims` are set.
  const paint = useCallback(() => {
    const canvas = previewRef.current;
    const bmp = bmpRef.current;
    if (!canvas || !bmp || !dims) return;
    const scale = Math.min(1, 720 / dims.width);
    canvas.width = Math.max(1, Math.round(dims.width * scale));
    canvas.height = Math.max(1, Math.round(dims.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(bmp as CanvasImageSource, 0, 0, canvas.width, canvas.height);
    if (rect) {
      const rx = Math.min(rect.startX, rect.x);
      const ry = Math.min(rect.startY, rect.y);
      const rw = Math.abs(rect.x - rect.startX);
      const rh = Math.abs(rect.y - rect.startY);
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeStyle = '#ff6a00';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(rx, ry, rw, rh);
      ctx.restore();
    }
  }, [dims, rect]);

  useEffect(() => {
    paint();
  }, [paint]);

  const pointerPos = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = event.currentTarget;
    const bounds = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - bounds.left) * canvas.width) / bounds.width,
      y: ((event.clientY - bounds.top) * canvas.height) / bounds.height,
    };
  };

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!file) return;
    const {x, y} = pointerPos(event);
    setRect({startX: x, startY: y, x, y});
    setNote(null);
    setError(null);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!rect) return;
    const {x, y} = pointerPos(event);
    setRect(prev => (prev ? {...prev, x, y} : prev));
  };

  const onPointerUp = () => {
    // Keep the final rectangle; paint() renders it crisply.
  };

  const apply = async () => {
    const canvas = previewRef.current;
    if (!file || !rect || !dims || !canvas) return;
    const region = toFractions(rect, canvas.width, canvas.height);
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const result = await pixelateRegion(file, {region, blockSize});
      const dot = file.name.lastIndexOf('.');
      const stem = dot > 0 ? file.name.slice(0, dot) : file.name;
      const ext = result.mime === 'image/png' ? '.png' : '.jpg';
      const name = `${stem}-censored${ext}`;
      downloadBlob(result.blob, name);
      setNote(
        `Downloaded ${name} (${formatBytes(result.blob.size)}, was ${formatBytes(file.size)}). The region was mosaic-encoded and cannot be restored.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not pixelate this region.');
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setRect(null);
    setNote(null);
    setError(null);
  };

  const hasSelection =
    rect !== null && Math.abs(rect.x - rect.startX) > 8 && Math.abs(rect.y - rect.startY) > 8;

  const accept = useMemo(
    () => 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp',
    [],
  );

  return (
    <VStack gap={4}>
      <FileInput
        label="Image to censor"
        description="Draw a box over the area to hide, then download the censored copy. Processing happens on a local canvas."
        accept={accept}
        mode="dropzone"
        value={file}
        onChange={value => {
          setFile(asFile(value));
          setRect(null);
          setNote(null);
          setError(null);
        }}
      />

      {file && dims && (
        <>
          <VStack gap={2}>
            <canvas
              ref={previewRef}
              style={{maxWidth: '100%', borderRadius: 'var(--radius-container)', cursor: 'crosshair', touchAction: 'none'}}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
            />
            <Text type="supporting" display="block">
              {dims.width} × {dims.height} px - drag on the image to select the region.
            </Text>
          </VStack>

          <HStack gap={3} wrap="wrap" vAlign="center">
            <Text type="label" display="block" style={{minWidth: 140}}>
              Mosaic block: {blockSize} px
            </Text>
            <Slider
              label="Mosaic block size"
              isLabelHidden
              min={6}
              max={80}
              step={2}
              value={blockSize}
              onChange={setBlockSize}
            />
          </HStack>

          <HStack gap={3} wrap="wrap" vAlign="center">
            <Button
              label="Download censored copy"
              variant="primary"
              icon={<Icon icon="arrowDown" size="sm" />}
              onClick={() => void apply()}
              isLoading={busy}
              isDisabled={!hasSelection}
            />
            <Button label="Clear selection" variant="secondary" onClick={reset} isDisabled={!rect} />
            <StatusDot variant="neutral" label="Local processing only" />
          </HStack>
        </>
      )}

      {error && <Banner status="error" title="Could not censor" description={error} />}
      {note && <Banner status="success" title="Censored copy downloaded" description={note} />}

      {file && (
        <Text type="supporting" display="block">
          The region is reduced to solid color blocks with nearest-neighbour upscaling:
          there is no blur for software to undo. JPEG output re-encodes the whole
          image at high quality; PNG output is lossless outside the mosaic.
        </Text>
      )}
    </VStack>
  );
}
