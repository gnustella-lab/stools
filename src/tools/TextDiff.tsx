import {useMemo, useState} from 'react';
import {VStack, HStack, StackItem} from '@astryxdesign/core/Layout';
import {TextArea} from '@astryxdesign/core/TextArea';
import {Text} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';

type DiffLine = {
  type: 'same' | 'added' | 'removed';
  text: string;
};

function computeDiff(before: string[], after: string[]): DiffLine[] {
  const rows = before.length;
  const cols = after.length;
  const lcs: number[][] = Array.from({length: rows + 1}, () =>
    new Array<number>(cols + 1).fill(0),
  );

  for (let r = rows - 1; r >= 0; r--) {
    for (let c = cols - 1; c >= 0; c--) {
      lcs[r][c] =
        before[r] === after[c]
          ? lcs[r + 1][c + 1] + 1
          : Math.max(lcs[r + 1][c], lcs[r][c + 1]);
    }
  }

  const result: DiffLine[] = [];
  let r = 0;
  let c = 0;
  while (r < rows && c < cols) {
    if (before[r] === after[c]) {
      result.push({type: 'same', text: before[r]});
      r++;
      c++;
    } else if (lcs[r + 1][c] >= lcs[r][c + 1]) {
      result.push({type: 'removed', text: before[r]});
      r++;
    } else {
      result.push({type: 'added', text: after[c]});
      c++;
    }
  }
  while (r < rows) {
    result.push({type: 'removed', text: before[r]});
    r++;
  }
  while (c < cols) {
    result.push({type: 'added', text: after[c]});
    c++;
  }
  return result;
}

export default function TextDiff() {
  const [original, setOriginal] = useState('');
  const [modified, setModified] = useState('');

  const diff = useMemo(() => {
    if (original === '' && modified === '') return [];
    return computeDiff(original.split('\n'), modified.split('\n'));
  }, [original, modified]);

  const stats = useMemo(() => {
    const added = diff.filter(l => l.type === 'added').length;
    const removed = diff.filter(l => l.type === 'removed').length;
    return {added, removed};
  }, [diff]);

  return (
    <VStack gap={4}>
      <HStack gap={4} wrap="wrap">
        <StackItem size="fill">
          <TextArea
            label="Original"
            placeholder="Paste the original version…"
            value={original}
            onChange={setOriginal}
            rows={8}
            hasSpellCheck={false}
          />
        </StackItem>
        <StackItem size="fill">
          <TextArea
            label="Modified"
            placeholder="Paste the modified version…"
            value={modified}
            onChange={setModified}
            rows={8}
            hasSpellCheck={false}
          />
        </StackItem>
      </HStack>

      <HStack gap={3} wrap="wrap" vAlign="center">
        <Text type="supporting" display="block">
          {stats.added > 0 || stats.removed > 0
            ? `${stats.added} line${stats.added === 1 ? '' : 's'} added · ${stats.removed} line${stats.removed === 1 ? '' : 's'} removed`
            : 'The texts are identical.'}
        </Text>
        <Button
          label="Clear both"
          variant="ghost"
          onClick={() => {
            setOriginal('');
            setModified('');
          }}
        />
      </HStack>

      {diff.length > 0 && !(stats.added === 0 && stats.removed === 0) && (
        <VStack gap={0}>
          {diff.map((line, index) => (
            <DiffRow key={index} type={line.type} text={line.text} />
          ))}
        </VStack>
      )}
    </VStack>
  );
}

function DiffRow({type, text}: {type: DiffLine['type']; text: string}) {
  const prefix = type === 'added' ? '+ ' : type === 'removed' ? '- ' : '  ';
  return (
    <Text
      type="code"
      display="block"
      wordBreak="break-all"
      style={{
        paddingInline: 'var(--spacing-2)',
        backgroundColor:
          type === 'added'
            ? 'var(--color-background-green)'
            : type === 'removed'
              ? 'var(--color-background-red)'
              : undefined,
      }}
    >
      {prefix + text}
    </Text>
  );
}
