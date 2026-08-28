import { useMemo, useState } from 'react';
import { VStack, HStack } from '@astryxdesign/core/Layout';
import { TextArea } from '@astryxdesign/core/TextArea';
import { Text } from '@astryxdesign/core/Text';
import { Banner } from '@astryxdesign/core/Banner';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { Token } from '@astryxdesign/core/Token';
import { CopyButton } from '../components/CopyButton';
import { scrubEnvText } from '../lib/envScrub';

export default function EnvScrubber() {
  const [input, setInput] = useState('# example .env\nDATABASE_URL=postgres://user:pass@localhost/db\nSECRET_KEY=sk-1234567890abcdef1234567890\nAWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE\n# yaml\napi_key: "ghp_1234567890abcdef12345678"\nprivate_key: |\n  -----BEGIN PRIVATE KEY-----\n  MIIBVAIBADANBgkqhkiG9w0BAQEFAASCAT4=\n  -----END PRIVATE KEY-----');
  const [redact, setRedact] = useState('[REDACTED]');

  const result = useMemo(() => scrubEnvText(input, redact), [input, redact]);

  return (
    <VStack gap={4}>
      <Text type="supporting" display="block">
        Audit .env, docker-compose.yml, or INI configs locally. Keys matching token/secret/password/api-key are flagged and masked — nothing leaves this tab.
      </Text>

      <TextArea label="Config content" placeholder="Paste .env or YAML…" value={input} onChange={setInput} rows={10} hasSpellCheck={false} />

      <HStack gap={3} wrap="wrap" vAlign="center">
        <Text type="label" display="block">Redaction:</Text>
        <input value={redact} onChange={e => setRedact(e.target.value)} placeholder="[REDACTED]" style={{ padding: '6px 8px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-control)' }} />
        <CopyButton value={result.scrubbed} />
      </HStack>

      <HStack gap={2} wrap="wrap" vAlign="center">
        <Text weight="semibold" display="block">Entries: {result.entries.length}</Text>
        <Token label={`${result.secretCount} secret(s)`} size="sm" color={result.secretCount ? 'red' : 'green'} />
        {result.entries.filter(e => e.isSecret).slice(0, 6).map(e => (
          <Token key={e.key} label={e.key} size="sm" color="orange" />
        ))}
      </HStack>

      {result.entries.length > 0 && (
        <VStack gap={1}>
          {result.entries.map((e, i) => (
            <HStack key={i} gap={2} wrap="wrap" vAlign="center">
              <Token label={e.key} size="sm" color={e.isSecret ? 'red' : 'green'} />
              <Text type="code" display="block">{e.isSecret ? redact : e.value.slice(0, 40)}</Text>
              <Text type="supporting" display="block">line {e.line} {e.isSecret ? '• secret' : '• keep'}</Text>
            </HStack>
          ))}
        </VStack>
      )}

      <CodeBlock code={result.scrubbed} language="bash" width="100%" maxHeight={360} isWrapped hasCopyButton={false} />

      <Banner status="warning" title="Review before sharing" description="Detection is name-based (SECRET_KEY, TOKEN, etc.) plus high-entropy values. Unusual key names or multiline secrets can be missed. Always skim the cleaned file." />
    </VStack>
  );
}
