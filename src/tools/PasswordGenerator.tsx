import {useMemo, useState} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Text} from '@astryxdesign/core/Text';
import {Slider} from '@astryxdesign/core/Slider';
import {Switch} from '@astryxdesign/core/Switch';
import {SegmentedControl, SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';
import {Selector} from '@astryxdesign/core/Selector';
import {CodeBlock} from '@astryxdesign/core/CodeBlock';
import {Button} from '@astryxdesign/core/Button';
import {CopyButton} from '../components/CopyButton';
import {secureRandomInt, randomWords, estimatePassphraseEntropy, formatEntropyBits} from '../lib/random';

const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGITS = '0123456789';
const SYMBOLS = '!@#$%^&*()-_=+[]{};:,.<>?/~';
const AMBIGUOUS = new Set('Il1O0oB8S5Z2G6q9');

function pickChar(pool: string): string {
  return pool[secureRandomInt(pool.length)];
}

function generatePassword(length: number, opts: Options): string {
  const pools: string[] = [];
  if (opts.lower) pools.push(LOWER);
  if (opts.upper) pools.push(UPPER);
  if (opts.digits) pools.push(DIGITS);
  if (opts.symbols) pools.push(SYMBOLS);
  let pool = pools.join('');
  if (!pool) pool = LOWER;
  if (opts.noAmbiguous) {
    const filtered = [...pool].filter(ch => !AMBIGUOUS.has(ch)).join('');
    if (filtered.length >= 8) pool = filtered;
  }
  return Array.from({length}, () => pickChar(pool)).join('');
}

interface Options {
  lower: boolean;
  upper: boolean;
  digits: boolean;
  symbols: boolean;
  noAmbiguous: boolean;
}

export default function PasswordGenerator() {
  const [mode, setMode] = useState('password');
  const [length, setLength] = useState(20);
  const [wordCount, setWordCount] = useState(5);
  const [separator, setSeparator] = useState('-');
  const [capitalize, setCapitalize] = useState(true);
  const [appendNumber, setAppendNumber] = useState(true);
  const [opts, setOpts] = useState<Options>({
    lower: true,
    upper: true,
    digits: true,
    symbols: true,
    noAmbiguous: false,
  });
  const [generated, setGenerated] = useState(() =>
    generatePassword(20, {
      lower: true,
      upper: true,
      digits: true,
      symbols: true,
      noAmbiguous: false,
    }),
  );

  const generate = () => {
    if (mode === 'password') {
      setGenerated(generatePassword(length, opts));
    } else {
      const words = randomWords(wordCount).map(w =>
        capitalize ? w[0].toUpperCase() + w.slice(1) : w,
      );
      const base = words.join(separator);
      setGenerated(appendNumber ? `${base}${separator}${secureRandomInt(100)}` : base);
    }
  };

  const entropyBits = useMemo(() => {
    if (mode === 'passphrase') {
      return estimatePassphraseEntropy(wordCount) + (appendNumber ? Math.log2(100) : 0);
    }
    const pools: string[] = [];
    if (opts.lower) pools.push(LOWER);
    if (opts.upper) pools.push(UPPER);
    if (opts.digits) pools.push(DIGITS);
    if (opts.symbols) pools.push(SYMBOLS);
    let size = pools.join('').length;
    if (size === 0) size = LOWER.length;
    else if (opts.noAmbiguous) {
      const filtered = pools.join('').split('').filter(c => !AMBIGUOUS.has(c)).length;
      if (filtered >= 8) size = filtered;
    }
    return length * Math.log2(size);
  }, [mode, length, wordCount, appendNumber, opts]);

  const strength =
    entropyBits >= 100
      ? {label: 'Excellent', variant: 'success' as const}
      : entropyBits >= 75
        ? {label: 'Strong', variant: 'success' as const}
        : entropyBits >= 50
          ? {label: 'Fair', variant: 'warning' as const}
          : {label: 'Weak', variant: 'error' as const};

  return (
    <VStack gap={4}>
      <HStack gap={4} wrap="wrap" vAlign="end">
        <SegmentedControl label="Generator mode" value={mode} onChange={setMode}>
          <SegmentedControlItem value="password" label="Password" />
          <SegmentedControlItem value="passphrase" label="Passphrase" />
        </SegmentedControl>
        <CopyButton value={generated} />
        <Button label="Generate" variant="primary" onClick={generate} />
      </HStack>

      <CodeBlock
        code={generated || 'Click Generate to create a secret'}
        language="plaintext"
        width="100%"
        isWrapped
      />

      {generated && (
        <HStack gap={2} vAlign="center">
          <Text type="supporting" display="block">
            Estimated strength: {formatEntropyBits(entropyBits)} - {strength.label}
          </Text>
        </HStack>
      )}

      {mode === 'password' ? (
        <VStack gap={3}>
          <Slider
            label="Length"
            min={6}
            max={128}
            value={length}
            onChange={setLength}
            onChangeEnd={generate}
          />
          <Switch
            label="Lowercase letters (a-z)"
            value={opts.lower}
            onChange={v => setOpts({...opts, lower: v})}
          />
          <Switch
            label="Uppercase letters (A-Z)"
            value={opts.upper}
            onChange={v => setOpts({...opts, upper: v})}
          />
          <Switch
            label="Digits (0-9)"
            value={opts.digits}
            onChange={v => setOpts({...opts, digits: v})}
          />
          <Switch
            label="Symbols (!@#$…)"
            value={opts.symbols}
            onChange={v => setOpts({...opts, symbols: v})}
          />
          <Switch
            label="Exclude ambiguous characters (l, 1, I, O, 0…)"
            description="Avoids characters that are easy to misread when typed by hand."
            value={opts.noAmbiguous}
            onChange={v => setOpts({...opts, noAmbiguous: v})}
          />
        </VStack>
      ) : (
        <VStack gap={3}>
          <Slider
            label="Words"
            min={3}
            max={12}
            value={wordCount}
            onChange={setWordCount}
            onChangeEnd={generate}
          />
          <Selector
            label="Separator"
            value={separator}
            onChange={setSeparator}
            options={[
              {value: '-', label: 'Hyphen (-)'},
              {value: '.', label: 'Dot (.)'},
              {value: '_', label: 'Underscore (_)'},
              {value: ' ', label: 'Space'},
              {value: '', label: 'None'},
            ]}
          />
          <Switch
            label="Capitalize words"
            value={capitalize}
            onChange={setCapitalize}
          />
          <Switch
            label="Append random number"
            value={appendNumber}
            onChange={setAppendNumber}
          />
        </VStack>
      )}
    </VStack>
  );
}
