import {useMemo, useState} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {TextArea} from '@astryxdesign/core/TextArea';
import {Text} from '@astryxdesign/core/Text';
import {Heading} from '@astryxdesign/core/Text';
import {CodeBlock} from '@astryxdesign/core/CodeBlock';
import {StatusDot} from '@astryxdesign/core/StatusDot';

function base64UrlDecode(segment: string): string {
  const normalized = segment.replaceAll('-', '+').replaceAll('_', '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, ch => ch.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

interface DecodedToken {
  header: unknown;
  payload: unknown;
  signaturePresent: boolean;
}

function decodeJwt(token: string): DecodedToken {
  const parts = token.trim().split('.');
  if (parts.length < 2 || parts.length > 3) {
    throw new Error('A JWT must have 2 or 3 dot-separated segments.');
  }
  try {
    return {
      header: JSON.parse(base64UrlDecode(parts[0])),
      payload: JSON.parse(base64UrlDecode(parts[1])),
      signaturePresent: parts.length === 3 && parts[2].length > 0,
    };
  } catch {
    throw new Error('Segments are not valid Base64URL-encoded JSON.');
  }
}

function prettyJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export default function JwtDecoder() {
  const [token, setToken] = useState('');

  const result = useMemo(() => {
    const trimmed = token.trim();
    if (!trimmed) return null;
    try {
      return {decoded: decodeJwt(trimmed), error: null as string | null};
    } catch (e) {
      return {decoded: null, error: e instanceof Error ? e.message : 'Invalid token'};
    }
  }, [token]);

  const expiry = useMemo(() => {
    if (!result?.decoded) return null;
    const payload = result.decoded.payload as Record<string, unknown>;
    return typeof payload.exp === 'number' ? payload.exp : null;
  }, [result]);

  const expired =
    expiry !== null &&
    expiry * (expiry > 1e12 ? 1 : 1000) < Date.now();

  return (
    <VStack gap={4}>
      <TextArea
        label="JSON Web Token"
        placeholder="Paste a JWT (eyJhbGciOi…)"
        value={token}
        onChange={setToken}
        rows={5}
        hasSpellCheck={false}
      />

      {result?.error && (
        <Text color="accent" display="block">
          {result.error}
        </Text>
      )}

      {result?.decoded && (
        <VStack gap={4}>
          <HStack gap={2} vAlign="center">
            <StatusDot
              variant={expired ? 'error' : 'warning'}
              label={
                expired
                  ? 'Token is expired'
                  : result.decoded.signaturePresent
                    ? 'Signature present, not verified'
                    : 'No signature segment'
              }
            />
            <Text type="supporting" display="block">
              {expired
                ? 'The exp claim is in the past.'
                : result.decoded.signaturePresent
                  ? 'Signature present — decoding only, not verified.'
                  : 'Unsigned token (alg "none" or missing signature).'}
            </Text>
          </HStack>

          <VStack gap={2}>
            <Heading level={3}>Header</Heading>
            <CodeBlock
              code={prettyJson(result.decoded.header)}
              language="json"
              width="100%"
              hasCopyButton={false}
            />
          </VStack>

          <VStack gap={2}>
            <Heading level={3}>Payload</Heading>
            <CodeBlock
              code={prettyJson(result.decoded.payload)}
              language="json"
              width="100%"
              hasCopyButton={false}
            />
          </VStack>
        </VStack>
      )}
    </VStack>
  );
}
