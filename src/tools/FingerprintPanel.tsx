import {useCallback, useEffect, useState} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Button} from '@astryxdesign/core/Button';
import {Text} from '@astryxdesign/core/Text';
import {Banner} from '@astryxdesign/core/Banner';
import {Card} from '@astryxdesign/core/Card';
import {Heading} from '@astryxdesign/core/Heading';
import {MetadataList, MetadataListItem} from '@astryxdesign/core/MetadataList';
import {StatusDot} from '@astryxdesign/core/StatusDot';
import {Token} from '@astryxdesign/core/Token';
import {collectFingerprint, type FingerprintGroup} from '../lib/fingerprint';

export default function FingerprintPanel() {
  const [groups, setGroups] = useState<FingerprintGroup[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scan = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      setGroups(await collectFingerprint());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The probe could not run in this browser.');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void scan();
  }, [scan]);

  const identifying = groups
    ? groups.flatMap(g => g.items).filter(item => item.isIdentifying && item.value !== 'not exposed' && item.value !== 'unknown').length
    : 0;

  return (
    <VStack gap={4}>
      <HStack gap={3} wrap="wrap" vAlign="center">
        <Button
          label={busy ? 'Probing…' : 'Re-run probe'}
          variant="secondary"
          onClick={() => void scan()}
          isLoading={busy}
        />
        <Text type="supporting" display="block">
          These are the values any website could read right now, in this browser.
        </Text>
      </HStack>

      <Banner
        status="info"
        title="Everything below stays on this page"
        description="This panel reads the same standard APIs a third-party script would use. It is a mirror, not a scanner: no value here is sent anywhere or stored."
      />

      {error && (
        <Banner status="error" title="Probe failed" description={error} />
      )}

      {groups && (
        <HStack gap={2} wrap="wrap" vAlign="center">
          <StatusDot
            variant={identifying > 8 ? 'warning' : 'success'}
            label={`${identifying} high-signal values visible`}
          />
          <Text type="supporting" display="block">
            Fewer is better. Extensions like GhostPrint reduce these.
          </Text>
        </HStack>
      )}

      <VStack gap={4}>
        {(groups ?? []).map(group => (
          <Card key={group.title} padding={4} width="100%" variant="muted">
            <VStack gap={3}>
              <Heading level={3}>{group.title}</Heading>
              <MetadataList>
                {group.items.map(item => (
                  <MetadataListItem key={item.label} label={item.label}>
                    <HStack gap={2} vAlign="center" wrap="wrap">
                      <span style={{wordBreak: 'break-all'}}>{item.value}</span>
                      {item.isIdentifying && item.value !== 'not exposed' && item.value !== 'unknown' && (
                        <Token label="identifying" size="sm" color="orange" />
                      )}
                    </HStack>
                  </MetadataListItem>
                ))}
              </MetadataList>
            </VStack>
          </Card>
        ))}
      </VStack>

      <Text type="supporting" display="block">
        A unique combination of even ordinary values (screen size plus timezone plus
        fonts) can single you out. Blocking one value is not enough; reducing all of
        them raises the size of the crowd you hide in.
      </Text>
    </VStack>
  );
}
