import { useMemo, useState } from 'react';
import { VStack, HStack } from '@astryxdesign/core/Layout';
import { TextArea } from '@astryxdesign/core/TextArea';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Text } from '@astryxdesign/core/Text';
import { Switch } from '@astryxdesign/core/Switch';
import { Token } from '@astryxdesign/core/Token';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { CopyButton } from '../components/CopyButton';
import { pseudonymizeFreeText, DEFAULT_FREE_OPTIONS } from '../lib/freePseudonymize';

export default function FreeTextPseudonymizer() {
  const [input, setInput] = useState('Hello Ana Silva,\n\nYour order for alice@example.com (IP 203.0.113.5, phone +55 11 99999-1234) has shipped.\nContact bob@example.com for questions.\n\nBest, Carlos Mendes');
  const [opts, setOpts] = useState(DEFAULT_FREE_OPTIONS);
  const [salt, setSalt] = useState('local-salt');

  const result = useMemo(() => pseudonymizeFreeText(input, { ...opts, salt }), [input, opts, salt]);

  return (
    <VStack gap={4}>
      <Text type="supporting" display="block">
        Pseudonymize free-text while keeping it readable. Same email/phone/IP → same pseudonym with the salt, so you can share logs or tickets without breaking co-reference. All deterministic hashing stays in this tab.
      </Text>

      <TextArea label="Text" placeholder="Paste prose, logs, support tickets…" value={input} onChange={setInput} rows={7} hasSpellCheck={false} />

      <HStack gap={3} wrap="wrap" vAlign="end">
        <TextInput label="Salt" value={salt} onChange={setSalt} width="200px" />
        <Switch label="Emails" value={opts.pseudonymizeEmails} onChange={v => setOpts(p => ({ ...p, pseudonymizeEmails: v }))} />
        <Switch label="Phones" value={opts.pseudonymizePhones} onChange={v => setOpts(p => ({ ...p, pseudonymizePhones: v }))} />
        <Switch label="IPs" value={opts.pseudonymizeIps} onChange={v => setOpts(p => ({ ...p, pseudonymizeIps: v }))} />
        <Switch label="Names (heuristic)" value={opts.pseudonymizeNames} onChange={v => setOpts(p => ({ ...p, pseudonymizeNames: v }))} />
        <CopyButton value={result.output} />
      </HStack>

      <HStack gap={2} vAlign="center">
        <Text weight="semibold" display="block">Replacements: {result.replacements}</Text>
        {Object.entries(result.mapping).slice(0, 5).map(([k, v]) => (
          <Token key={k} label={`${k.slice(0, 12)} → ${v}`} size="sm" />
        ))}
      </HStack>

      <CodeBlock code={result.output} language="plaintext" width="100%" maxHeight={360} isWrapped hasCopyButton={false} />

      {Object.keys(result.mapping).length > 0 && (
        <VStack gap={1}>
          <Text weight="semibold" display="block">Mapping (keep private — reveals originals)</Text>
          <Text type="code" display="block" wordBreak="break-all">{JSON.stringify(result.mapping, null, 2)}</Text>
          <Text type="supporting" display="block">Do not share the mapping alongside the pseudonymized text. Same salt = same pseudonym across runs.</Text>
        </VStack>
      )}

      <Text type="supporting" display="block">Uses FNV-1a with salt (not a KDF). For tabular data use CSV/JSON Anonymizer; this tool is for unstructured prose. Review output — name heuristic can over-match.</Text>
    </VStack>
  );
}
