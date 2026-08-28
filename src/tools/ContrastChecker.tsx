import { useMemo, useState } from 'react';
import { VStack, HStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import { Token } from '@astryxdesign/core/Token';
import { Banner } from '@astryxdesign/core/Banner';
import { Center } from '@astryxdesign/core/Center';
import { contrastRatio, wcagRating, simulateDaltonism, type DaltonismType } from '../lib/contrast';

export default function ContrastChecker() {
  const [fg, setFg] = useState('#ffffff');
  const [bg, setBg] = useState('#1f6feb');
  const [daltonism, setDaltonism] = useState<DaltonismType | 'none'>('none');

  const ratio = useMemo(() => contrastRatio(fg, bg), [fg, bg]);
  const rating = useMemo(() => (ratio != null ? wcagRating(ratio) : null), [ratio]);
  const fgSim = useMemo(() => (daltonism === 'none' ? fg : simulateDaltonism(fg, daltonism) ?? fg), [fg, daltonism]);
  const bgSim = useMemo(() => (daltonism === 'none' ? bg : simulateDaltonism(bg, daltonism) ?? bg), [bg, daltonism]);
  const ratioSim = useMemo(() => contrastRatio(fgSim, bgSim), [fgSim, bgSim]);

  return (
    <VStack gap={4}>
      <Text type="supporting" display="block">
        Check WCAG contrast ratio locally with luminance math — plus protanopia/deuteranopia/tritanopia simulation via matrix. No upload.
      </Text>

      <HStack gap={3} wrap="wrap" vAlign="end">
        <TextInput label="Foreground" value={fg} onChange={setFg} width="160px" />
        <input type="color" value={fg} onChange={e => setFg(e.target.value)} style={{ width: 44, height: 36, borderRadius: 'var(--radius-control)', border: '1px solid var(--color-border)' }} />
        <TextInput label="Background" value={bg} onChange={setBg} width="160px" />
        <input type="color" value={bg} onChange={e => setBg(e.target.value)} style={{ width: 44, height: 36, borderRadius: 'var(--radius-control)', border: '1px solid var(--color-border)' }} />
        <SegmentedControl label="Simulation" value={daltonism} onChange={v => setDaltonism(v as typeof daltonism)}>
          <SegmentedControlItem value="none" label="None" />
          <SegmentedControlItem value="protanopia" label="Protan" />
          <SegmentedControlItem value="deuteranopia" label="Deuteran" />
          <SegmentedControlItem value="tritanopia" label="Tritan" />
        </SegmentedControl>
      </HStack>

      {ratio == null ? (
        <Banner status="error" title="Invalid color" description="Use HEX #RGB or #RRGGBB." />
      ) : (
        <VStack gap={3}>
          <HStack gap={3} wrap="wrap" vAlign="center">
            <Token label={`${ratio.toFixed(2)} : 1`} size="sm" color={ratio >= 4.5 ? 'green' : ratio >= 3 ? 'orange' : 'red'} />
            {rating && (
              <>
                <Token label={`Normal ${rating.normal}`} size="sm" color={rating.normal === 'fail' ? 'red' : rating.normal === 'AA' ? 'orange' : 'green'} />
                <Token label={`Large ${rating.large}`} size="sm" color={rating.large === 'fail' ? 'red' : rating.large === 'AA' ? 'orange' : 'green'} />
              </>
            )}
            {daltonism !== 'none' && ratioSim != null && <Token label={`Sim ${ratioSim.toFixed(2)}:1`} size="sm" />}
          </HStack>

          <HStack gap={3} wrap="wrap">
            <VStack gap={2}>
              <Text weight="semibold" display="block">Preview</Text>
              <Center width="240px" height="120px" style={{ background: bg, color: fg, borderRadius: 'var(--radius-container)', border: '1px solid var(--color-border)', fontWeight: 600 }}>Aa Sample Text</Center>
              <Text type="supporting" display="block">Normal text needs 4.5:1 (AA), large 3:1. AAA is 7:1 / 4.5:1.</Text>
            </VStack>
            {daltonism !== 'none' && (
              <VStack gap={2}>
                <Text weight="semibold" display="block">Simulated {daltonism}</Text>
                <Center width="240px" height="120px" style={{ background: bgSim, color: fgSim, borderRadius: 'var(--radius-container)', border: '1px solid var(--color-border)', fontWeight: 600 }}>Aa Sample Text</Center>
                <Text type="supporting" display="block">{fgSim} on {bgSim}</Text>
              </VStack>
            )}
          </HStack>

          <Banner status={ratio >= 4.5 ? 'success' : ratio >= 3 ? 'warning' : 'error'} title={ratio >= 7 ? 'AAA pass' : ratio >= 4.5 ? 'AA pass' : ratio >= 3 ? 'AA large only' : 'Fail'} description={rating ? `Normal: ${rating.normal}, Large: ${rating.large} — ratio ${ratio.toFixed(2)}:1` : ''} />
        </VStack>
      )}

      <Banner status="info" title="Honest limits" description="WCAG formula is math only — simulation is approximation, not medical diagnosis. For audits test with real users and assistive tech." />
    </VStack>
  );
}
