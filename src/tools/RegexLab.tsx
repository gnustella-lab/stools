import { useMemo, useState } from 'react';
import { VStack, HStack } from '@astryxdesign/core/Layout';
import { TextArea } from '@astryxdesign/core/TextArea';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Text } from '@astryxdesign/core/Text';
import { Banner } from '@astryxdesign/core/Banner';
import { Switch } from '@astryxdesign/core/Switch';
import { Token } from '@astryxdesign/core/Token';
import { CopyButton } from '../components/CopyButton';

interface MatchInfo {
  index: number;
  match: string;
  groups: (string | undefined)[];
  namedGroups?: Record<string, string>;
}

function testRegex(pattern: string, flags: string, text: string): { matches: MatchInfo[]; error: string | null } {
  if (!pattern) return { matches: [], error: null };
  try {
    const re = new RegExp(pattern, flags);
    const matches: MatchInfo[] = [];
    if (flags.includes('g')) {
      let m: RegExpExecArray | null;
      const copy = new RegExp(re.source, re.flags);
      while ((m = copy.exec(text)) !== null) {
        if (m[0] === '' ) { copy.lastIndex++; continue; }
        matches.push({ index: m.index, match: m[0], groups: m.slice(1), namedGroups: m.groups });
        if (matches.length > 500) break;
      }
    } else {
      const m = re.exec(text);
      if (m) matches.push({ index: m.index, match: m[0], groups: m.slice(1), namedGroups: m.groups });
    }
    return { matches, error: null };
  } catch (e) {
    return { matches: [], error: e instanceof Error ? e.message : String(e) };
  }
}

function highlight(text: string, matches: MatchInfo[]): string {
  if (!matches.length) return text;
  let out = '';
  let last = 0;
  const sorted = [...matches].sort((a,b)=>a.index-b.index);
  for (const m of sorted) {
    if (m.index < last) continue;
    out += text.slice(last, m.index);
    out += `⟦${m.match}⟧`;
    last = m.index + m.match.length;
  }
  out += text.slice(last);
  return out;
}

export default function RegexLab() {
  const [pattern, setPattern] = useState('\\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}\\b');
  const [flags, setFlags] = useState('gi');
  const [text, setText] = useState('Contact alice@example.com and bob@test.org — token sk-abc123 and IP 203.0.113.5');
  const [replace, setReplace] = useState('[REDACTED:email]');
  const [showReplace, setShowReplace] = useState(false);

  const { matches, error } = useMemo(() => testRegex(pattern, flags, text), [pattern, flags, text]);

  const replaced = useMemo(() => {
    if (!pattern || error) return '';
    try {
      const re = new RegExp(pattern, flags);
      return text.replace(re, replace);
    } catch { return ''; }
  }, [pattern, flags, text, replace, error]);

  const flagsToggle = (flag: string) => {
    setFlags(prev => prev.includes(flag) ? prev.replace(flag,'') : (prev + flag).split('').sort().join(''));
  };

  return (
    <VStack gap={4}>
      <Text type="supporting" display="block">
        Test regular expressions offline against your own text. Useful for crafting PII redaction patterns without sending samples to regex101.
      </Text>

      <VStack gap={2}>
        <TextInput label="Pattern (without //)" placeholder="\btoken\b" value={pattern} onChange={setPattern} width="100%" status={error ? { type: 'error', message: error } : undefined} />
        <HStack gap={3} wrap="wrap" vAlign="center">
          <Text type="label" display="block">Flags:</Text>
          {['g','i','m','s','u'].map(f => (
            <Switch key={f} label={f} value={flags.includes(f)} onChange={() => flagsToggle(f)} />
          ))}
          <Text type="supporting" display="block">/{pattern || '—'}/{flags || '—'}</Text>
          <CopyButton value={`/${pattern}/${flags}`} label="Copy" />
        </HStack>
      </VStack>

      <TextArea label="Test text" placeholder="Paste logs, emails, config…" value={text} onChange={setText} rows={6} hasSpellCheck={false} />

      <VStack gap={2}>
        <HStack gap={2} vAlign="center">
          <Text weight="semibold" display="block">Matches: {matches.length}</Text>
          {matches.length > 0 && <Token label={`${matches.length} hit(s)`} size="sm" color="green" />}
          <Switch label="Show replace preview" value={showReplace} onChange={setShowReplace} />
        </HStack>
        {matches.length > 0 ? (
          <VStack gap={2}>
            <Text type="code" display="block" wordBreak="break-all">{highlight(text, matches)}</Text>
            <VStack gap={1}>
              {matches.slice(0,20).map((m,i)=>(
                <HStack key={i} gap={2} wrap="wrap" vAlign="center">
                  <Token label={`#${i+1} @${m.index}`} size="sm" />
                  <Text type="code" display="block">{JSON.stringify(m.match)}</Text>
                  {m.groups.length >0 && <Text type="supporting" display="block">groups: {JSON.stringify(m.groups)}</Text>}
                  {m.namedGroups && Object.keys(m.namedGroups).length>0 && <Text type="supporting" display="block">named: {JSON.stringify(m.namedGroups)}</Text>}
                </HStack>
              ))}
              {matches.length>20 && <Text type="supporting" display="block">…and {matches.length-20} more</Text>}
            </VStack>
          </VStack>
        ) : (
          <Text type="supporting" display="block">No matches with current pattern/flags.</Text>
        )}
      </VStack>

      {showReplace && (
        <VStack gap={2}>
          <TextInput label="Replacement (supports $1, $&)" value={replace} onChange={setReplace} />
          <Text type="supporting" display="block">Preview:</Text>
          <Text type="code" display="block" wordBreak="break-all">{replaced.slice(0,2000)}</Text>
          <CopyButton value={replaced} label="Copy replaced" />
        </VStack>
      )}

      <Banner status="info" title="Privacy" description="Pattern and test text never leave this tab. For PII, prefer the Secret Redactor or PII Risk Scanner for curated patterns." />
    </VStack>
  );
}
