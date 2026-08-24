import {useMemo, useState} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {TextArea} from '@astryxdesign/core/TextArea';
import {Text} from '@astryxdesign/core/Text';
import {CopyButton} from '../components/CopyButton';

type CaseFormat = 'camel' | 'pascal' | 'snake' | 'kebab' | 'constant' | 'title' | 'sentence';

function splitWords(input: string): string[] {
  return input
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean);
}

const capitalize = (word: string): string => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();

function convert(input: string, format: CaseFormat): string {
  const words = splitWords(input);
  switch (format) {
    case 'camel':
      return words
        .map((w, i) => (i === 0 ? w.toLowerCase() : capitalize(w)))
        .join('');
    case 'pascal':
      return words.map(capitalize).join('');
    case 'snake':
      return words.map(w => w.toLowerCase()).join('_');
    case 'kebab':
      return words.map(w => w.toLowerCase()).join('-');
    case 'constant':
      return words.map(w => w.toUpperCase()).join('_');
    case 'title':
      return words.map(capitalize).join(' ');
    case 'sentence': {
      const sentence = words.map(w => w.toLowerCase()).join(' ');
      return sentence.charAt(0).toUpperCase() + sentence.slice(1);
    }
  }
}

const FORMATS: {format: CaseFormat; label: string; example: string}[] = [
  {format: 'camel', label: 'camelCase', example: 'myVariableName'},
  {format: 'pascal', label: 'PascalCase', example: 'MyVariableName'},
  {format: 'snake', label: 'snake_case', example: 'my_variable_name'},
  {format: 'kebab', label: 'kebab-case', example: 'my-variable-name'},
  {format: 'constant', label: 'CONSTANT_CASE', example: 'MY_VARIABLE_NAME'},
  {format: 'title', label: 'Title Case', example: 'My Variable Name'},
  {format: 'sentence', label: 'Sentence case', example: 'My variable name'},
];

export default function CaseConverter() {
  const [input, setInput] = useState('');

  const results = useMemo(
    () => FORMATS.map(f => ({...f, value: convert(input, f.format)})),
    [input],
  );

  return (
    <VStack gap={4}>
      <TextArea
        label="Input text"
        placeholder="Paste any text - mixedCase, snake_case, spaces, dashes…"
        value={input}
        onChange={setInput}
        rows={4}
        hasSpellCheck={false}
      />

      <VStack gap={3}>
        {results.map(result => (
          <HStack key={result.format} gap={3} wrap="wrap" vAlign="center">
            <Text type="label" display="block">
              {result.label}
            </Text>
            <Text type="code" display="block" wordBreak="break-all">
              {result.value || '-'}
            </Text>
            <CopyButton value={result.value} label="Copy" />
          </HStack>
        ))}
      </VStack>

      <Text type="supporting" display="block">
        Word boundaries are detected from casing, underscores, hyphens and
        whitespace. Everything runs locally in your browser.
      </Text>
    </VStack>
  );
}
