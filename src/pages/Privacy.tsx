import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Section} from '@astryxdesign/core/Section';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {Card} from '@astryxdesign/core/Card';
import {Grid} from '@astryxdesign/core/Grid';
import {Divider} from '@astryxdesign/core/Divider';
import {StatusDot} from '@astryxdesign/core/StatusDot';
import {Banner} from '@astryxdesign/core/Banner';
import {Link} from '@astryxdesign/core/Link';
import {List, ListItem} from '@astryxdesign/core/List';
import {HOME_HREF} from '../router';

export default function Privacy() {
  return (
    <VStack gap={6}>
      <Section variant="transparent" padding={0}>
        <VStack gap={3}>
          <HStack gap={2} vAlign="center">
            <StatusDot variant="success" label="No data leaves this device" />
            <Text type="label">Privacy model</Text>
          </HStack>
          <Heading level={1} type="display-2" textWrap="balance">
            Your data stays in this tab.
          </Heading>
          <Text type="large" color="secondary" display="block" textWrap="pretty">
            sTools is a static website. There is no backend, no account system and no
            analytics pipeline. Every tool is JavaScript that runs in your browser
            using Web Crypto, Canvas and the File API.
          </Text>
        </VStack>
      </Section>

      <Banner
        status="success"
        title="Nothing you paste is uploaded"
        description="Open the Network panel in your browser's developer tools while using a tool. You will only see the static assets that make up this page."
      />

      <Grid columns={{minWidth: 260}} gap={4} width="100%">
        <Card padding={5} variant="muted">
          <VStack gap={2}>
            <Heading level={3}>What we collect</Heading>
            <Text color="secondary" display="block">
              Nothing. sTools does not set cookies, does not fingerprint visitors and
              does not phone home. If this site is hosted by a third party, that host
              may see a standard HTTP request for the HTML/JS/CSS - not the contents
              of the tools.
            </Text>
          </VStack>
        </Card>
        <Card padding={5} variant="muted">
          <VStack gap={2}>
            <Heading level={3}>Where computation happens</Heading>
            <Text color="secondary" display="block">
              In this process, in RAM. Hashes use Web Crypto. Passwords use
              crypto.getRandomValues. Images are read with FileReader / createImageBitmap
              and never posted. Encrypted envelopes are sealed with AES-GCM after
              PBKDF2 (210,000 iterations, SHA-256).
            </Text>
          </VStack>
        </Card>
        <Card padding={5} variant="muted">
          <VStack gap={2}>
            <Heading level={3}>What we cannot protect you from</Heading>
            <Text color="secondary" display="block">
              A compromised device, a malicious browser extension, malware that
              screenshots the tab, or someone standing behind you. Local processing
              removes the server from the threat model. It does not replace a locked
              screen or a trustworthy computer.
            </Text>
          </VStack>
        </Card>
      </Grid>

      <Divider />

      <List
        listStyle="decimal"
        header={<Heading level={2}>How to verify</Heading>}
      >
        <ListItem label="Disconnect from the internet after the page has loaded. The tools keep working because they do not need a server." />
        <ListItem label="Watch the Network tab while hashing a file or decoding a JWT. Your input never appears as a request payload." />
        <ListItem label="Save the site and open the files from disk. sTools is a static build - no backend, no sync." />
        <ListItem label="Read the source. Crypto lives in src/lib/crypto.ts and uses only the Web Crypto API." />
      </List>

      <Section variant="transparent" padding={0}>
        <VStack gap={3}>
          <Heading level={2}>Honest limits</Heading>
          <Text color="secondary" display="block" textWrap="pretty">
            Stripping image metadata re-encodes the pixels on a canvas, which drops
            EXIF/GPS but is lossy for JPEG. JWT decoding inspects claims; it does
            not verify signatures against a public key. AES envelopes are only as
            strong as the passphrase you choose. Treat these as everyday privacy
            utilities, not a substitute for specialist forensic or cryptographic
            software.
          </Text>
          <Link href={HOME_HREF}>Back to all tools</Link>
        </VStack>
      </Section>
    </VStack>
  );
}
