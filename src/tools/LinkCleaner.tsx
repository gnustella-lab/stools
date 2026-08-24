import {useMemo, useState} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {TextArea} from '@astryxdesign/core/TextArea';
import {Switch} from '@astryxdesign/core/Switch';
import {Text} from '@astryxdesign/core/Text';
import {Banner} from '@astryxdesign/core/Banner';
import {Token} from '@astryxdesign/core/Token';
import {CopyButton} from '../components/CopyButton';
import {LINK_RULES, cleanLink, type CleanLinkResult} from '../lib/linkclean';

const ALL_GROUPS = LINK_RULES.map(rule => rule.id);

function cleanAll(
  input: string,
  enabledGroups: Set<string>,
): {results: CleanLinkResult[]; errors: string[]} {
  const lines = input.split(/\s+/).map(line => line.trim()).filter(Boolean);
  const results: CleanLinkResult[] = [];
  const errors: string[] = [];
  for (const line of lines) {
    try {
      results.push(cleanLink(line, enabledGroups));
    } catch (e) {
      errors.push(e instanceof Error ? e.message : `Could not parse: ${line}`);
    }
  }
  return {results, errors};
}

export default function LinkCleaner() {
  const [input, setInput] = useState('');
  const [enabled, setEnabled] = useState<Set<string>>(() => new Set(ALL_GROUPS));

  const toggle = (id: string, value: boolean) => {
    setEnabled(prev => {
      const next = new Set(prev);
      if (value) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const outcome = useMemo(() => {
    if (!input.trim()) return null;
    return cleanAll(input, enabled);
  }, [input, enabled]);

  const totalRemoved = outcome
    ? outcome.results.reduce((sum, result) => sum + result.removedParams.length, 0)
    : 0;

  const deduped = useMemo(() => {
    if (!outcome) return [] as CleanLinkResult[];
    const seen = new Set<string>();
    return outcome.results.filter(result => {
      if (seen.has(result.url)) return false;
      seen.add(result.url);
      return true;
    });
  }, [outcome]);

  return (
    <VStack gap={4}>
      <TextArea
        label="Links to clean"
        placeholder="Paste one or more URLs - separated by spaces or newlines…"
        value={input}
        onChange={setInput}
        rows={5}
        hasSpellCheck={false}
      />

      <VStack gap={2}>
        <Text weight="semibold" display="block">
          Parameter groups
        </Text>
        {LINK_RULES.map(rule => (
          <Switch
            key={rule.id}
            label={rule.label}
            description={rule.description}
            value={enabled.has(rule.id)}
            onChange={value => toggle(rule.id, value)}
          />
        ))}
      </VStack>

      {outcome && outcome.errors.length > 0 && (
        <Banner status="error" title="Some lines could not be parsed" description={outcome.errors[0]} />
      )}

      {outcome && (
        <HStack gap={2} wrap="wrap" vAlign="center">
          <Token
            label={`${totalRemoved} tracking parameter${totalRemoved === 1 ? '' : 's'} removed`}
            size="sm"
            color="orange"
          />
          <Token label={`${deduped.length} unique link${deduped.length === 1 ? '' : 's'}`} size="sm" />
        </HStack>
      )}

      {deduped.map((result, index) => (
        <VStack key={`${result.url}-${index}`} gap={1}>
          <CodeRow url={result.url} removed={result.removedParams} />
        </VStack>
      ))}

      {input && !outcome?.errors.length && totalRemoved === 0 && (
        <Text type="supporting" display="block">
          No known tracking parameters were found in these links with the current groups.
        </Text>
      )}

      <Text type="supporting" display="block">
        Links are parsed and rebuilt locally with the standard URL API. Some sites
        may require additional parameters that are not on this list - always check
        the page still works before sharing.
      </Text>
    </VStack>
  );
}

function CodeRow({url, removed}: {url: string; removed: string[]}) {
  return (
    <VStack gap={1}>
      <HStack gap={2} vAlign="center" wrap="wrap">
        <Text type="code" display="block" wordBreak="break-all">
          {url}
        </Text>
        <CopyButton value={url} label="Copy" />
      </HStack>
      {removed.length > 0 && (
        <Text type="supporting" display="block">
          Removed: {removed.join(', ')}
        </Text>
      )}
    </VStack>
  );
}
