import { useMemo, useState } from 'react';
import { VStack, HStack } from '@astryxdesign/core/Layout';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Text } from '@astryxdesign/core/Text';
import { Switch } from '@astryxdesign/core/Switch';
import { Banner } from '@astryxdesign/core/Banner';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { Token } from '@astryxdesign/core/Token';
import { CopyButton } from '../components/CopyButton';
import { buildCspHeader, validateCsp, generateNonce, emptyCspConfig, type CspDirective } from '../lib/csp';

const DIRECTIVES: CspDirective[] = ['default-src', 'script-src', 'style-src', 'img-src', 'connect-src', 'font-src', 'frame-ancestors', 'base-uri', 'object-src'];

export default function CspBuilder() {
  const [config, setConfig] = useState(() => emptyCspConfig());
  const [upgrade, setUpgrade] = useState(false);
  const [nonces, setNonces] = useState<Record<string, string>>({});

  const header = useMemo(() => buildCspHeader({ ...config, upgradeInsecureRequests: upgrade }), [config, upgrade]);
  const warnings = useMemo(() => validateCsp(header), [header]);

  const setDirective = (d: CspDirective, value: string) => {
    const parts = value.split(/\s+/).map(s => s.trim()).filter(Boolean);
    setConfig(prev => ({ ...prev, directives: { ...prev.directives, [d]: parts } }));
  };

  const addNonce = (d: CspDirective) => {
    const n = generateNonce();
    const token = `'nonce-${n}'`;
    setNonces(prev => ({ ...prev, [d]: n }));
    setConfig(prev => ({ ...prev, directives: { ...prev.directives, [d]: [...prev.directives[d], token] } }));
  };

  return (
    <VStack gap={4}>
      <Text type="supporting" display="block">
        Build a Content-Security-Policy header locally. Edit directives, generate nonces, and copy the header or meta tag — no network needed.
      </Text>

      <VStack gap={3}>
        {DIRECTIVES.map(d => (
          <HStack key={d} gap={2} wrap="wrap" vAlign="end">
            <TextInput label={d} placeholder={d === 'default-src' ? "'self'" : "e.g. 'self' https://cdn.example.com"} value={config.directives[d].join(' ')} onChange={v => setDirective(d, v)} width="420px" hasClear />
            {(d === 'script-src' || d === 'style-src') && (
              <button onClick={() => addNonce(d)} style={{ padding: '6px 12px', borderRadius: 'var(--radius-control)', border: '1px solid var(--color-border)', background: 'var(--color-background)', cursor: 'pointer' }}>+ nonce</button>
            )}
          </HStack>
        ))}

        <Switch label="upgrade-insecure-requests" value={upgrade} onChange={setUpgrade} />
      </VStack>

      <VStack gap={2}>
        <HStack gap={2} vAlign="center">
          <Text weight="semibold" display="block">Header</Text>
          <CopyButton value={header} />
        </HStack>
        <CodeBlock code={header || '(empty policy)'} language="plaintext" width="100%" isWrapped hasCopyButton={false} />
        <CodeBlock code={`<meta http-equiv="Content-Security-Policy" content="${header.replace(/"/g, '&quot;')}">`} language="html" width="100%" isWrapped hasCopyButton />
      </VStack>

      {Object.keys(nonces).length > 0 && (
        <VStack gap={1}>
          <Text weight="semibold" display="block">Generated nonces (keep secret — add to script tags)</Text>
          {Object.entries(nonces).map(([d, n]) => (
            <HStack key={d} gap={2}>
              <Token label={d} size="sm" />
              <Text type="code" display="block">{n}</Text>
              <Text type="code" display="block">&lt;script nonce="{n}"&gt;</Text>
            </HStack>
          ))}
        </VStack>
      )}

      {warnings.length > 0 ? (
        <VStack gap={1}>
          {warnings.map((w, i) => (
            <Banner key={i} status="warning" title="Recommendation" description={w} />
          ))}
        </VStack>
      ) : (
        <Banner status="success" title="Looks good" description="No obvious issues with current heuristics. Test the policy with Content-Security-Policy-Report-Only first before enforcing." />
      )}

      <Text type="supporting" display="block">This builder doesn't fetch anything or test against your site. Deploy with report-only, monitor violations, then enforce.</Text>
    </VStack>
  );
}
