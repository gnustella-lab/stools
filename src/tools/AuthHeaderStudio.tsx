import { useMemo, useState } from 'react';
import { VStack, HStack } from '@astryxdesign/core/Layout';
import { TextInput } from '@astryxdesign/core/TextInput';
import { TextArea } from '@astryxdesign/core/TextArea';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import { Text } from '@astryxdesign/core/Text';
import { Banner } from '@astryxdesign/core/Banner';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { CopyButton } from '../components/CopyButton';

function encodeBasic(user: string, pass: string): string {
  const raw = `${user}:${pass}`;
  const bytes = new TextEncoder().encode(raw);
  let binary = '';
  bytes.forEach(b => (binary += String.fromCharCode(b)));
  return `Basic ${btoa(binary)}`;
}

function decodeBasic(header: string): { user: string; pass: string } | null {
  const trimmed = header.trim();
  const b64 = trimmed.replace(/^Basic\s+/i, '');
  try {
    const binary = atob(b64);
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
    const decoded = new TextDecoder().decode(bytes);
    const colon = decoded.indexOf(':');
    if (colon === -1) return null;
    return { user: decoded.slice(0, colon), pass: decoded.slice(colon + 1) };
  } catch {
    return null;
  }
}

export default function AuthHeaderStudio() {
  const [mode, setMode] = useState<'basic-build' | 'basic-decode' | 'bearer'>('basic-build');
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [bearer, setBearer] = useState('');
  const [decodeInput, setDecodeInput] = useState('');

  const basicHeader = useMemo(() => {
    if (!user && !pass) return '';
    return encodeBasic(user, pass);
  }, [user, pass]);

  const bearerHeader = useMemo(() => {
    if (!bearer.trim()) return '';
    const t = bearer.trim();
    return t.toLowerCase().startsWith('bearer ') ? t : `Bearer ${t}`;
  }, [bearer]);

  const decoded = useMemo(() => {
    if (!decodeInput.trim()) return null;
    return decodeBasic(decodeInput);
  }, [decodeInput]);

  return (
    <VStack gap={4}>
      <Text type="supporting" display="block">
        Build and decode HTTP Authorization headers locally. Credentials are encoded with UTF-8 + Base64 in this tab and never sent anywhere.
      </Text>

      <SegmentedControl label="Mode" value={mode} onChange={v => setMode(v as typeof mode)}>
        <SegmentedControlItem value="basic-build" label="Basic — Build" />
        <SegmentedControlItem value="basic-decode" label="Basic — Decode" />
        <SegmentedControlItem value="bearer" label="Bearer" />
      </SegmentedControl>

      {mode === 'basic-build' && (
        <VStack gap={3}>
          <HStack gap={3} wrap="wrap">
            <TextInput label="Username" placeholder="alice" value={user} onChange={setUser} />
            <TextInput label="Password" placeholder="s3cr3t" value={pass} onChange={setPass} hasClear />
          </HStack>
          {basicHeader && (
            <VStack gap={2}>
              <HStack gap={2} vAlign="center">
                <Text weight="semibold" display="block">Authorization header</Text>
                <CopyButton value={basicHeader} />
              </HStack>
              <CodeBlock code={basicHeader} language="plaintext" width="100%" isWrapped hasCopyButton={false} />
              <CodeBlock code={`fetch("https://example.com/api", {\n  headers: { Authorization: "${basicHeader}" }\n})`} language="javascript" width="100%" isWrapped hasCopyButton />
              <Banner status="warning" title="Caution" description="Basic auth is only as secure as the transport. Use only over HTTPS and never paste production credentials into a stranger's site — this one runs locally, but your clipboard still lingers." />
            </VStack>
          )}
        </VStack>
      )}

      {mode === 'basic-decode' && (
        <VStack gap={3}>
          <TextArea label="Authorization header" placeholder="Basic YWxpY2U6czNjcjN0" value={decodeInput} onChange={setDecodeInput} rows={3} hasSpellCheck={false} />
          {decodeInput.trim() && (
            decoded ? (
              <VStack gap={2}>
                <Text weight="semibold" display="block">Decoded</Text>
                <HStack gap={3} wrap="wrap">
                  <Text type="code" display="block">user: {decoded.user || '—'}</Text>
                  <Text type="code" display="block">pass: {decoded.pass ? '••••' : '—'}</Text>
                  <CopyButton value={decoded.user} label="Copy user" />
                </HStack>
                <Text type="supporting" display="block">Password is hidden by default. Reveal only on a trusted device.</Text>
                <CodeBlock code={`user="${decoded.user}"\npass="${decoded.pass}"`} language="plaintext" width="100%" isWrapped hasCopyButton={false} />
              </VStack>
            ) : (
              <Banner status="error" title="Could not decode" description="Expected format: Basic <base64 of user:pass>. Check padding and that the value is not truncated." />
            )
          )}
        </VStack>
      )}

      {mode === 'bearer' && (
        <VStack gap={3}>
          <TextArea label="Token" placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…" value={bearer} onChange={setBearer} rows={3} hasSpellCheck={false} />
          {bearerHeader && (
            <VStack gap={2}>
              <HStack gap={2} vAlign="center">
                <Text weight="semibold" display="block">Authorization header</Text>
                <CopyButton value={bearerHeader} />
              </HStack>
              <CodeBlock code={bearerHeader} language="plaintext" width="100%" isWrapped hasCopyButton={false} />
              <Text type="supporting" display="block">Tip: paste a JWT to inspect claims with the JWT Decoder tool — signature is not verified locally.</Text>
            </VStack>
          )}
        </VStack>
      )}

      <Banner status="info" title="Privacy" description="All encoding/decoding uses TextEncoder/TextDecoder and atob/btoa in this tab. No network request is made." />
    </VStack>
  );
}
