import {useMemo, useState} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {TextArea} from '@astryxdesign/core/TextArea';
import {FileInput} from '@astryxdesign/core/FileInput';
import {Slider} from '@astryxdesign/core/Slider';
import {Switch} from '@astryxdesign/core/Switch';
import {Button} from '@astryxdesign/core/Button';
import {Text} from '@astryxdesign/core/Text';
import {Banner} from '@astryxdesign/core/Banner';
import {Token} from '@astryxdesign/core/Token';
import {CodeBlock} from '@astryxdesign/core/CodeBlock';
import {CopyButton} from '../components/CopyButton';
import {asFile, downloadBlob, formatBytes} from '../lib/files';
import {
  anonymizeGeo,
  DEFAULT_GEO_OPTIONS,
  detectGeoFormat,
  precisionHint,
  type GeoAnonymizeOptions,
} from '../lib/geoanonymize';

export default function LocationAnonymizer() {
  const [input, setInput] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [options, setOptions] = useState<GeoAnonymizeOptions>(DEFAULT_GEO_OPTIONS);
  const [ioError, setIoError] = useState<string | null>(null);

  const detected = useMemo(() => (input.trim() ? detectGeoFormat(input) : 'unknown'), [input]);

  const parsed = useMemo(() => {
    if (!input.trim()) return {result: null, error: null};
    try {
      return {result: anonymizeGeo(input, options), error: null};
    } catch (e) {
      return {result: null, error: e instanceof Error ? e.message : 'Could not anonymize.'};
    }
  }, [input, options]);

  const result = parsed.result;
  const error = ioError ?? parsed.error;

  const loadFile = async (next: File | File[] | null) => {
    const picked = asFile(next);
    setFile(picked);
    setIoError(null);
    if (!picked) return;
    try {
      setInput(await picked.text());
    } catch (e) {
      setIoError(e instanceof Error ? e.message : 'Could not read file.');
    }
  };

  const download = () => {
    if (!result) return;
    const ext = result.format === 'gpx' ? 'gpx' : 'geojson';
    const mime = result.format === 'gpx' ? 'application/gpx+xml' : 'application/geo+json';
    const base = file?.name.replace(/\.[^.]+$/, '') ?? 'track';
    downloadBlob(new Blob([result.output], {type: mime}), `${base}-anonymized.${ext}`);
  };

  return (
    <VStack gap={4}>
      <Text color="secondary" display="block" textWrap="pretty">
        Fuzz GPX and GeoJSON tracks before you publish a hike, commute or field survey. Coordinates
        are rounded and optionally shifted; timestamps, elevation and names can be dropped. No map
        tile is fetched.
      </Text>

      <FileInput
        label="GPX or GeoJSON file (optional)"
        description="Read locally via FileReader - never uploaded."
        accept=".gpx,.geojson,.json,.txt,application/gpx+xml,application/geo+json,application/json"
        mode="dropzone"
        value={file}
        onChange={v => void loadFile(v)}
      />

      <TextArea
        label="Paste GPX or GeoJSON"
        placeholder={`<gpx><trk><trkseg>\n  <trkpt lat="-23.550520" lon="-46.633308"><time>2024-01-01T12:00:00Z</time></trkpt>\n</trkseg></trk></gpx>`}
        value={input}
        onChange={value => {
          setInput(value);
          setIoError(null);
          if (value) setFile(null);
        }}
        rows={10}
        hasSpellCheck={false}
      />

      <Slider
        label={`Coordinate precision (${precisionHint(options.decimalPlaces)})`}
        min={1}
        max={6}
        value={options.decimalPlaces}
        onChange={(value: number) => setOptions(prev => ({...prev, decimalPlaces: value}))}
      />
      <Slider
        label={`Random noise (${options.noiseMeters} m)`}
        min={0}
        max={500}
        value={options.noiseMeters}
        onChange={(value: number) => setOptions(prev => ({...prev, noiseMeters: value}))}
      />
      <Switch
        label="Strip timestamps"
        description="Removes time and timestamp fields so the trail cannot be aligned with a calendar."
        value={options.stripTime}
        onChange={value => setOptions(prev => ({...prev, stripTime: value}))}
      />
      <Switch
        label="Strip elevation"
        description="Drops ele / altitude, which can re-identify a unique ridge or building."
        value={options.stripElevation}
        onChange={value => setOptions(prev => ({...prev, stripElevation: value}))}
      />
      <Switch
        label="Strip names and metadata"
        description="Removes name, description, author, email and similar tags."
        value={options.stripMetadata}
        onChange={value => setOptions(prev => ({...prev, stripMetadata: value}))}
      />

      {input.trim() && detected !== 'unknown' && (
        <Token label={`Detected ${detected.toUpperCase()}`} size="sm" />
      )}

      {error && <Banner status="error" title="Could not anonymize" description={error} />}

      {result && (
        <VStack gap={3}>
          <HStack gap={2} wrap="wrap" vAlign="center">
            <Token label={result.note} size="sm" color="orange" />
            <CopyButton value={result.output} />
            <Button label="Download" variant="secondary" onClick={download} />
          </HStack>
          <Text type="supporting" display="block">
            {formatBytes(new TextEncoder().encode(result.output).length)} output
          </Text>
          <CodeBlock
            code={result.output}
            language={result.format === 'geojson' ? 'json' : 'xml'}
            width="100%"
            maxHeight={420}
            isWrapped
            hasCopyButton={false}
          />
        </VStack>
      )}

      <Text type="supporting" display="block" textWrap="pretty">
        Coarse precision still leaves the neighbourhood visible, and a unique route shape can
        re-identify a person. Review the map in a local GIS tool before publishing.
      </Text>
    </VStack>
  );
}
