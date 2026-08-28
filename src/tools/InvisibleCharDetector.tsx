import { useMemo, useState } from 'react';
import { VStack, HStack } from '@astryxdesign/core/Layout';
import { TextArea } from '@astryxdesign/core/TextArea';
import { Text } from '@astryxdesign/core/Text';
import { Banner } from '@astryxdesign/core/Banner';
import { Token } from '@astryxdesign/core/Token';
import { CopyButton } from '../components/CopyButton';
import { scanInvisible, stripInvisible, visualizeInvisible } from '../lib/invisible';

export default function InvisibleCharDetector() {
  const [input, setInput] = useState('Paste text with hidden characters — try: hello\u200Bworld\u202E\u2066test');
  const findings = useMemo(() => scanInvisible(input), [input]);
  const viz = useMemo(() => visualizeInvisible(input), [input]);
  const stripped = useMemo(() => stripInvisible(input), [input]);

  return (
    <VStack gap={4}>
      <Text type="supporting" display="block">
        Reveal invisible Unicode characters that can hide tracking, spoof text, or break copy-paste. Scan clipboard content, filenames, or pasted code — all locally.
      </Text>

      <TextArea label="Text to inspect" placeholder="Paste any text — code, filenames, URLs, chat messages…" value={input} onChange={setInput} rows={6} hasSpellCheck={false} />

      <HStack gap={2} wrap="wrap" vAlign="center">
        <Text weight="semibold" display="block">Findings: {findings.length}</Text>
        {findings.length === 0 ? <Token label="Clean" size="sm" color="green" /> : <Token label={`${findings.length} hidden`} size="sm" color="red" />}
        <CopyButton value={stripped.cleaned} label="Copy cleaned" isDisabled={findings.length === 0} />
        {findings.length > 0 && <Text type="supporting" display="block">{stripped.removed} character(s) would be removed</Text>}
      </HStack>

      {findings.length > 0 ? (
        <VStack gap={2}>
          {findings.map((f, i) => (
            <HStack key={i} gap={2} wrap="wrap" vAlign="center">
              <Token label={f.codepoint} size="sm" color="orange" />
              <Text type="code" display="block">{f.name}</Text>
              <Text type="supporting" display="block">@{f.index} — context: {f.context}</Text>
            </HStack>
          ))}
          <VStack gap={1}>
            <Text weight="semibold" display="block">Visualized</Text>
            <Text type="code" display="block" wordBreak="break-all">{viz}</Text>
          </VStack>
          <VStack gap={1}>
            <Text weight="semibold" display="block">Cleaned preview</Text>
            <Text type="code" display="block" wordBreak="break-all">{stripped.cleaned.slice(0, 2000)}</Text>
          </VStack>
          <Banner status="warning" title="Risk" description="Right-to-Left Override (RLO) and zero-width characters can spoof filenames (e.g., invoice.pdf.exe) and hide tracking identifiers. Strip them before sharing or executing." />
        </VStack>
      ) : (
        <Banner status="success" title="No invisible characters found" description="No zero-width, bidi overrides, or variation selectors detected with current heuristics. Homograph lookalikes (Cyrillic а vs Latin a) are checked by the Homograph Detector." />
      )}

      <Text type="supporting" display="block">
        Complements Homograph Detector (which checks domain/URL confusables). This tool focuses on generic text and clipboard.
      </Text>
    </VStack>
  );
}
