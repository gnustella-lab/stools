import {Suspense} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Section} from '@astryxdesign/core/Section';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {Card} from '@astryxdesign/core/Card';
import {Breadcrumbs, BreadcrumbItem} from '@astryxdesign/core/Breadcrumbs';
import {Divider} from '@astryxdesign/core/Divider';
import {Spinner} from '@astryxdesign/core/Spinner';
import {StatusDot} from '@astryxdesign/core/StatusDot';
import {Center} from '@astryxdesign/core/Center';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {Link} from '@astryxdesign/core/Link';
import {Token} from '@astryxdesign/core/Token';
import {findTool, TOOLS} from '../tools/registry';
import {HOME_HREF, PRIVACY_HREF, toolHref} from '../router';

export default function ToolPage({id}: {id: string}) {
  const tool = findTool(id);

  if (!tool) {
    return (
      <VStack gap={4}>
        <EmptyState
          title="Tool not found"
          description={`No tool exists at "${id}". It may have been renamed or removed.`}
          actions={<Link href={HOME_HREF}>Back to all tools</Link>}
        />
      </VStack>
    );
  }

  const IconComponent = tool.icon;
  const ToolComponent = tool.component;
  const related = TOOLS.filter(t => t.category === tool.category && t.id !== tool.id).slice(0, 4);

  return (
    <VStack gap={5}>
      <Breadcrumbs label="Breadcrumb">
        <BreadcrumbItem href={HOME_HREF}>All tools</BreadcrumbItem>
        <BreadcrumbItem isCurrent>{tool.name}</BreadcrumbItem>
      </Breadcrumbs>

      <Section variant="transparent" padding={0}>
        <VStack gap={2}>
          <HStack gap={3} vAlign="center" wrap="wrap">
            <IconComponent width={28} height={28} />
            <Heading level={1}>{tool.name}</Heading>
            <Token label={tool.category} size="sm" />
          </HStack>
          <Text color="secondary" display="block" textWrap="pretty">
            {tool.description}
          </Text>
          <HStack gap={2} vAlign="center">
            <StatusDot variant="success" label="Runs locally in your browser" />
            <Text type="supporting" display="block">
              Runs entirely in this tab - nothing is uploaded
            </Text>
          </HStack>
        </VStack>
      </Section>

      <Card padding={5} width="100%">
        <Suspense
          fallback={
            <Center minHeight={160}>
              <Spinner label={`Loading ${tool.name}`} />
            </Center>
          }
        >
          <ToolComponent />
        </Suspense>
      </Card>

      <Divider />

      <Section variant="transparent" padding={0}>
        <VStack gap={3}>
          <Heading level={3}>Privacy notes</Heading>
          <Text type="supporting" display="block" textWrap="pretty">
            This tool uses only client-side browser APIs (Web Crypto, FileReader,
            Canvas, standard JavaScript). Inputs are processed in memory and discarded
            when you close or reload the page. No network requests carry your data.{' '}
            <Link href={PRIVACY_HREF}>Privacy model</Link>
          </Text>
        </VStack>
      </Section>

      {related.length > 0 && (
        <Section variant="transparent" padding={0}>
          <VStack gap={3}>
            <Heading level={3}>More {tool.category.toLowerCase()} tools</Heading>
            <HStack gap={3} wrap="wrap">
              {related.map(t => (
                <Link key={t.id} href={toolHref(t.id)}>
                  {t.name}
                </Link>
              ))}
            </HStack>
          </VStack>
        </Section>
      )}
    </VStack>
  );
}
