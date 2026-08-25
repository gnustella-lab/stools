import {useMemo, useState} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {TextInput} from '@astryxdesign/core/TextInput';
import {Switch} from '@astryxdesign/core/Switch';
import {Text} from '@astryxdesign/core/Text';
import {Token} from '@astryxdesign/core/Token';
import {Card} from '@astryxdesign/core/Card';
import {Banner} from '@astryxdesign/core/Banner';
import {Heading} from '@astryxdesign/core/Heading';
import {analyzePassword} from '../lib/passwordStrength';
import {formatEntropyBits} from '../lib/random';

function scoreColor(score: number) {
  if (score >= 4) return 'green' as const;
  if (score >= 3) return 'green' as const;
  if (score >= 2) return 'yellow' as const;
  if (score >= 1) return 'orange' as const;
  return 'red' as const;
}

function severityColor(severity: string) {
  if (severity === 'high') return 'red' as const;
  if (severity === 'medium') return 'orange' as const;
  return 'yellow' as const;
}

export default function PasswordAnalyzer() {
  const [password, setPassword] = useState('');
  const [reveal, setReveal] = useState(false);

  const analysis = useMemo(() => analyzePassword(password), [password]);

  return (
    <VStack gap={4}>
      <Text color="secondary" display="block" textWrap="pretty">
        Estimate strength of a password or passphrase without sending it anywhere. Checks length,
        character classes, common passwords, keyboard walks and 1337 substitutions - all in this tab.
      </Text>

      <Banner
        status="info"
        title="Do not paste a password you currently use if someone can see your screen"
        description="The value never leaves the browser, but it is visible in this page's memory until you close the tab."
      />

      <TextInput
        label="Password or passphrase"
        placeholder={reveal ? 'Type or paste a secret' : '••••••••••••'}
        value={password}
        onChange={setPassword}
        type={reveal ? 'text' : 'password'}
        width="100%"
        hasClear
      />

      <Switch label="Show characters" value={reveal} onChange={setReveal} />

      {analysis && (
        <VStack gap={4}>
          <HStack gap={2} wrap="wrap" vAlign="center">
            <Token label={analysis.label} size="sm" color={scoreColor(analysis.score)} />
            <Token label={formatEntropyBits(analysis.entropyBits)} size="sm" />
            <Token label={`${analysis.length} chars`} size="sm" />
            <Token label={`~${analysis.charsetSize} symbol alphabet`} size="sm" />
          </HStack>

          <HStack gap={2} wrap="wrap">
            <Token label="a-z" size="sm" color={analysis.classes.lower ? 'green' : 'gray'} />
            <Token label="A-Z" size="sm" color={analysis.classes.upper ? 'green' : 'gray'} />
            <Token label="0-9" size="sm" color={analysis.classes.digit ? 'green' : 'gray'} />
            <Token label="symbols" size="sm" color={analysis.classes.symbol ? 'green' : 'gray'} />
            <Token label="unicode" size="sm" color={analysis.classes.unicode ? 'green' : 'gray'} />
          </HStack>

          <VStack gap={3}>
            <Heading level={3}>Findings</Heading>
            {analysis.findings.map((finding, index) => (
              <Card key={`${finding.title}-${index}`} padding={4}>
                <VStack gap={1}>
                  <HStack gap={2} vAlign="center">
                    <Token label={finding.severity} size="sm" color={severityColor(finding.severity)} />
                    <Text weight="semibold" display="block">
                      {finding.title}
                    </Text>
                  </HStack>
                  <Text color="secondary" display="block" textWrap="pretty">
                    {finding.detail}
                  </Text>
                </VStack>
              </Card>
            ))}
          </VStack>
        </VStack>
      )}

      <Text type="supporting" display="block" textWrap="pretty">
        Entropy here is a local estimate, not a guarantee. A unique password stored in a manager is
        stronger than a clever one you reuse. This tool never checks online breach corpora.
      </Text>
    </VStack>
  );
}
