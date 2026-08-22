import {useMemo, useState} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {TextArea} from '@astryxdesign/core/TextArea';
import {Switch} from '@astryxdesign/core/Switch';
import {Text} from '@astryxdesign/core/Text';
import {CodeBlock} from '@astryxdesign/core/CodeBlock';
import {Token} from '@astryxdesign/core/Token';
import {CopyButton} from '../components/CopyButton';
import {REDACTION_RULES, redactText} from '../lib/redact';

const ALL_IDS = REDACTION_RULES.map(rule => rule.id);

export default function SecretRedactor() {
  const [input, setInput] = useState('');
  const [enabled, setEnabled] = useState<Set<string>>(() => new Set(ALL_IDS));

  const result = useMemo(
    () => redactText(input, enabled),
    [input, enabled],
  );

  const toggle = (id: string, value: boolean) => {
    setEnabled(prev => {
      const next = new Set(prev);
      if (value) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  return (
    <VStack gap={4}>
      <TextArea
        label="Text to redact"
        placeholder="Paste logs, emails, support tickets or config files…"
        value={input}
        onChange={setInput}
        rows={8}
        hasSpellCheck={false}
      />

      <VStack gap={2}>
        <Text weight="semibold" display="block">
          Patterns
        </Text>
        {REDACTION_RULES.map(rule => (
          <Switch
            key={rule.id}
            label={rule.label}
            description={rule.description}
            value={enabled.has(rule.id)}
            onChange={value => toggle(rule.id, value)}
          />
        ))}
      </VStack>

      {input && (
        <HStack gap={2} wrap="wrap" vAlign="center">
          <Text type="supporting" display="block">
            {result.total === 0
              ? 'No matching secrets found with the current patterns.'
              : `${result.total} replacement${result.total === 1 ? '' : 's'}`}
          </Text>
          {REDACTION_RULES.filter(rule => (result.counts[rule.id] ?? 0) > 0).map(rule => (
            <Token
              key={rule.id}
              label={`${rule.label}: ${result.counts[rule.id]}`}
              size="sm"
              color="orange"
            />
          ))}
          <CopyButton value={result.output} />
        </HStack>
      )}

      {input && (
        <CodeBlock
          code={result.output}
          language="plaintext"
          width="100%"
          maxHeight={360}
          isWrapped
          hasCopyButton={false}
        />
      )}

      <Text type="supporting" display="block">
        Pattern matching is best-effort and can both miss secrets and over-redact
        numbers. Review the output before sharing. Nothing is sent anywhere.
      </Text>
    </VStack>
  );
}
