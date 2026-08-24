import {useMemo, useState} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Grid} from '@astryxdesign/core/Grid';
import {Section} from '@astryxdesign/core/Section';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {TextInput} from '@astryxdesign/core/TextInput';
import {SegmentedControl, SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';
import {ClickableCard} from '@astryxdesign/core/ClickableCard';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {Divider} from '@astryxdesign/core/Divider';
import {Icon} from '@astryxdesign/core/Icon';
import {StatusDot} from '@astryxdesign/core/StatusDot';
import {Card} from '@astryxdesign/core/Card';
import {Center} from '@astryxdesign/core/Center';
import {Token} from '@astryxdesign/core/Token';
import {Link} from '@astryxdesign/core/Link';
import {
  ShieldCheckIcon,
  WifiIcon,
  EyeSlashIcon,
  ComputerDesktopIcon,
} from '@heroicons/react/24/outline';
import {TOOLS, CATEGORY_ORDER} from '../tools/registry';
import {PRIVACY_HREF, toolHref} from '../router';

const PRINCIPLES = [
  {
    title: 'Runs on your machine',
    body: 'Hashes, passwords, tokens and photos are processed in this tab. Close it and the data is gone.',
    icon: ComputerDesktopIcon,
  },
  {
    title: 'No accounts, no telemetry',
    body: 'There is nothing to sign in to and nothing to opt out of. sTools does not know who you are.',
    icon: EyeSlashIcon,
  },
  {
    title: 'Works offline',
    body: 'Load the page once. After that you can cut the network and keep using every tool.',
    icon: WifiIcon,
  },
];

export default function Home() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TOOLS.filter(tool => {
      if (category !== 'all' && tool.category !== category) {
        return false;
      }
      if (q === '') {
        return true;
      }
      const haystack = [tool.name, tool.tagline, tool.description, ...tool.keywords]
        .join(' ')
        .toLowerCase();
      return q.split(/\s+/).every(term => haystack.includes(term));
    });
  }, [query, category]);

  return (
    <VStack gap={6}>
      <Section variant="transparent" padding={0}>
        <VStack gap={3}>
          <HStack gap={2} vAlign="center">
            <StatusDot variant="success" label="All tools run locally" isPulsing />
            <Text type="label">Privacy-first utility hub</Text>
          </HStack>
          <Heading level={1} type="display-2" textWrap="balance">
            Tools that never leave your device.
          </Heading>
          <Text type="large" color="secondary" display="block" textWrap="pretty">
            sTools is a collection of everyday security, encoding and data utilities.
            Every computation runs in your browser - no uploads, no accounts, no
            tracking. Open a tool, use it, close the tab.
          </Text>
        </VStack>
      </Section>

      <Grid columns={{minWidth: 240}} gap={4} width="100%">
        {PRINCIPLES.map(item => {
          const IconComponent = item.icon;
          return (
            <Card key={item.title} padding={5} variant="muted">
              <VStack gap={2}>
                <HStack gap={2} vAlign="center">
                  <IconComponent width={20} height={20} />
                  <Heading level={3}>{item.title}</Heading>
                </HStack>
                <Text color="secondary" display="block" textWrap="pretty">
                  {item.body}
                </Text>
              </VStack>
            </Card>
          );
        })}
      </Grid>

      <Divider />

      <Section variant="transparent" padding={0}>
        <VStack gap={4}>
          <Heading level={2}>All tools</Heading>
          <TextInput
            label="Search tools"
            placeholder="Search by name or keyword - try hash, jwt, exif, encrypt…"
            value={query}
            onChange={setQuery}
            hasClear
            width="100%"
            startIcon={<Icon icon="search" size="sm" />}
          />
          <SegmentedControl
            label="Filter by category"
            value={category}
            onChange={setCategory}
            layout="hug"
          >
            <SegmentedControlItem value="all" label={`All (${TOOLS.length})`} />
            {CATEGORY_ORDER.map(cat => {
              const count = TOOLS.filter(t => t.category === cat).length;
              return (
                <SegmentedControlItem key={cat} value={cat} label={`${cat} (${count})`} />
              );
            })}
          </SegmentedControl>

          {filtered.length === 0 ? (
            <EmptyState
              title="No tools match your search"
              description={`Nothing found for "${query}" in ${category === 'all' ? 'any category' : category}. Try a different keyword.`}
            />
          ) : (
            <Grid columns={{minWidth: 280}} gap={4} width="100%">
              {filtered.map(tool => {
                const IconComponent = tool.icon;
                return (
                  <ClickableCard
                    key={tool.id}
                    label={`Open ${tool.name}`}
                    href={toolHref(tool.id)}
                    elevation="low"
                  >
                    <VStack gap={3}>
                      <HStack gap={3} vAlign="center">
                        <Center
                          width="var(--spacing-10)"
                          height="var(--spacing-10)"
                          style={{
                            borderRadius: 'var(--radius-container)',
                            backgroundColor: 'var(--color-background-muted)',
                            flexShrink: 0,
                          }}
                        >
                          <IconComponent width={22} height={22} />
                        </Center>
                        <VStack gap={0.5}>
                          <Text weight="semibold" display="block">
                            {tool.name}
                          </Text>
                          <Token label={tool.category} size="sm" />
                        </VStack>
                      </HStack>
                      <Text type="supporting" display="block" textWrap="pretty">
                        {tool.tagline}
                      </Text>
                    </VStack>
                  </ClickableCard>
                );
              })}
            </Grid>
          )}
        </VStack>
      </Section>

      <Divider />

      <Section variant="transparent" padding={0}>
        <VStack gap={2}>
          <HStack gap={2} vAlign="center">
            <ShieldCheckIcon width={20} height={20} />
            <Heading level={2}>Why local processing matters</Heading>
          </HStack>
          <Text color="secondary" display="block" textWrap="pretty">
            Conventional online tools send your data to a server: passwords, tokens,
            JSON payloads and photos pass through machines you do not control, where
            they can be logged, retained or breached. sTools takes the opposite
            approach - every computation runs here, using standard browser APIs.
          </Text>
          <Link href={PRIVACY_HREF}>Read the full privacy model</Link>
        </VStack>
      </Section>

      <Section variant="transparent" padding={0}>
        <Divider />
        <VStack gap={1} paddingBlock={4}>
          <Text type="supporting" display="block">
            sTools - privacy-first utilities. All processing is local.
          </Text>
        </VStack>
      </Section>
    </VStack>
  );
}
