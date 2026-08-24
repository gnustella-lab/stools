import {useRef, useState} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {TextArea} from '@astryxdesign/core/TextArea';
import {TextInput} from '@astryxdesign/core/TextInput';
import {FileInput} from '@astryxdesign/core/FileInput';
import {Selector} from '@astryxdesign/core/Selector';
import {Slider} from '@astryxdesign/core/Slider';
import {Button} from '@astryxdesign/core/Button';
import {Text} from '@astryxdesign/core/Text';
import {Banner} from '@astryxdesign/core/Banner';
import {SegmentedControl, SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';
import {Card} from '@astryxdesign/core/Card';
import {CopyButton} from '../components/CopyButton';
import {asFile} from '../lib/files';
import {generateQrDataUrl, scanQrFromFile} from '../lib/qr';

type QrMode = 'generate' | 'scan';
type Ecc = 'L' | 'M' | 'Q' | 'H';

export default function QrStudio() {
  const [mode, setMode] = useState<QrMode>('generate');
  const [text, setText] = useState('https://example.com');
  const [size, setSize] = useState(280);
  const [margin, setMargin] = useState(2);
  const [ecc, setEcc] = useState<Ecc>('M');
  const [dark, setDark] = useState('#0f172a');
  const [light, setLight] = useState('#ffffff');
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanFile, setScanFile] = useState<File | null>(null);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generate = async () => {
    setError(null);
    try {
      const url = await generateQrDataUrl({
        text,
        size,
        margin,
        errorCorrectionLevel: ecc,
        darkColor: dark,
        lightColor: light,
      });
      setDataUrl(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not generate QR.');
    }
  };

  const download = () => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'qr.png';
    a.rel = 'noopener';
    document.body.append(a);
    a.click();
    a.remove();
  };

  const scan = async () => {
    if (!scanFile) {
      setScanError('Select an image containing a QR code.');
      return;
    }
    setScanning(true);
    setScanError(null);
    setScanResult(null);
    try {
      const res = await scanQrFromFile(scanFile);
      if (!res) setScanError('No QR code detected in this image. Try a clearer, uncropped photo.');
      else setScanResult(res.text);
    } catch (e) {
      setScanError(e instanceof Error ? e.message : 'Could not scan.');
    } finally {
      setScanning(false);
    }
  };

  return (
    <VStack gap={4}>
      <Text color="secondary" display="block" textWrap="pretty">
        Generate QR codes for URLs, WiFi, Pix or secrets without calling an external API, and scan QR images locally.
        Rendering uses Canvas and decoding uses <Text type="code">jsQR</Text> - both bundled, both offline.
      </Text>

      <SegmentedControl label="Mode" value={mode} onChange={v => setMode(v as QrMode)}>
        <SegmentedControlItem value="generate" label="Generate" />
        <SegmentedControlItem value="scan" label="Scan" />
      </SegmentedControl>

      {mode === 'generate' ? (
        <VStack gap={4}>
          <TextArea
            label="Text to encode"
            placeholder="https://example.com  -  WIFI:T:WPA;S:MyNetwork;P:secret;;  -  pix key  -  any text"
            value={text}
            onChange={setText}
            rows={3}
            hasSpellCheck={false}
          />

          <HStack gap={3} wrap="wrap" vAlign="end">
            <Slider label="Size (px)" min={160} max={600} value={size} onChange={setSize} />
            <Slider label="Margin" min={0} max={8} value={margin} onChange={setMargin} />
            <Selector
              label="Error correction"
              value={ecc}
              onChange={v => setEcc(v as Ecc)}
              options={[
                {value: 'L', label: 'L - 7%'},
                {value: 'M', label: 'M - 15%'},
                {value: 'Q', label: 'Q - 25%'},
                {value: 'H', label: 'H - 30%'},
              ]}
            />
          </HStack>

          <HStack gap={3} wrap="wrap">
            <TextInput label="Dark color" value={dark} onChange={setDark} placeholder="#000000" width="160px" />
            <TextInput label="Light color" value={light} onChange={setLight} placeholder="#ffffff" width="160px" />
            <Button label="Generate" variant="primary" onClick={() => void generate()} isDisabled={!text} />
            {dataUrl && <Button label="Download PNG" variant="secondary" onClick={download} />}
            {dataUrl && <CopyButton value={text} label="Copy text" />}
          </HStack>

          {error && <Banner status="error" title="Generation failed" description={error} />}

          {dataUrl && (
            <Card padding={4} variant="muted">
              <VStack gap={3}>
                <img
                  src={dataUrl}
                  alt="Generated QR code"
                  width={size}
                  height={size}
                  style={{imageRendering: 'pixelated', borderRadius: 'var(--radius-container)', background: light}}
                />
                <Text type="supporting" display="block">
                  Right-click or use Download to save. The QR encodes {text.length} character{text.length === 1 ? '' : 's'}.
                </Text>
                <canvas ref={canvasRef} style={{display: 'none'}} />
              </VStack>
            </Card>
          )}

          <Banner
            status="info"
            title="Privacy tip"
            description="QR generation happens on a Canvas in this tab. For secrets (WiFi password, private link) no image is uploaded for a server to log."
          />
        </VStack>
      ) : (
        <VStack gap={4}>
          <FileInput
            label="QR image to scan"
            description="PNG, JPEG or WebP - decoded locally with jsQR, never uploaded."
            accept="image/*"
            mode="dropzone"
            value={scanFile}
            onChange={v => setScanFile(asFile(v))}
          />
          <HStack gap={3} wrap="wrap" vAlign="center">
            <Button label="Scan" variant="primary" onClick={() => void scan()} isLoading={scanning} isDisabled={!scanFile} />
            {scanResult && <CopyButton value={scanResult} />}
          </HStack>

          {scanError && <Banner status="error" title="Scan failed" description={scanError} />}
          {scanResult && (
            <Card padding={4}>
              <VStack gap={2}>
                <Text weight="semibold" display="block">
                  Decoded text
                </Text>
                <Text wordBreak="break-all" display="block" type="code">
                  {scanResult}
                </Text>
                <Text type="supporting" display="block">
                  Verify the URL before opening - QR codes can hide tracking or phishing links. Paste the decoded URL into
                  Link Cleaner to strip trackers first.
                </Text>
              </VStack>
            </Card>
          )}
        </VStack>
      )}
    </VStack>
  );
}
