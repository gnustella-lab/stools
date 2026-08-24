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
              In this process, in RAM. Hashes and HMAC use Web Crypto. Passwords
              and salts use crypto.getRandomValues. Images are read with
              FileReader and createImageBitmap and never posted. Encrypted
              envelopes are sealed with AES-GCM after PBKDF2 (210,000
              iterations, SHA-256). CSV and JSON are parsed in memory, HTML is
              parsed with DOMParser, and QR codes are rendered and decoded with
              Canvas and bundled jsQR - all without a network request.
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
        <VStack gap={4}>
          <Heading level={2}>Honest limits</Heading>
          <Text color="secondary" display="block" textWrap="pretty">
            Local processing removes the server from the threat model, but every
            tool has trade-offs. Treat these as everyday privacy utilities, not a
            substitute for specialist forensic or certified cryptographic software.
          </Text>

          <List
            listStyle="disc"
            header={<Heading level={3}>What these tools do not do</Heading>}
          >
            <ListItem label="Image and video metadata: images are re-encoded on a Canvas, which drops EXIF and GPS but is lossy for JPEG; videos have udta, meta and XMP boxes stripped byte-for-byte without re-encoding, but vendor-specific boxes may remain." />
            <ListItem label="Image pixelation: selected regions become solid mosaic blocks with fillRect, so no blur can be reversed - but a too-small selection can still leave context clues." />
            <ListItem label="JWT decoding: inspects header and claims locally; it does not verify signatures against a public key or check revocation." />
            <ListItem label="AES and Vault: envelopes use AES-256-GCM with PBKDF2 (210,000 iterations, SHA-256). Security depends entirely on the passphrase you choose. Vault share URLs keep ciphertext in the fragment, which is not sent to a server but does stay in browser history and clipboard until you clear it. There is no forward secrecy." />
            <ListItem label="CSV and JSON Anonymizer: pseudonymization uses a fast FNV-1a hash plus the salt you provide, with deterministic mapping to preserve joins. It is not a cryptographic KDF and it does not provide k-anonymity or l-diversity. Small or sparse datasets can still allow re-identification. Always review the output before sharing." />
            <ListItem label="Email and Tracker Inspectors: detection is heuristic - 1x1 pixels, known tracker domains, utm and fbclid params, hidden iframes and fingerprint hints via DOMParser and regex. Novel trackers can be missed and legitimate images can be flagged. Not a replacement for a mail gateway or content security policy review." />
            <ListItem label="QR Studio: generation and decoding are bundled (qrcode and jsQR) and run on Canvas entirely offline. Scan can fail on blur, low contrast or damaged codes, and a QR code can hide any URL - verify decoded links with Link Cleaner before opening." />
            <ListItem label="Color Picker: picking, conversion and WCAG contrast use local math in this tab. EyeDropper needs a user gesture and browser support, and contrast is a formula estimate, not a certified accessibility audit." />
          </List>

          <Banner
            status="info"
            title="Use with care"
            description="A compromised device, a malicious extension, screen-capture malware or someone looking over your shoulder is not mitigated by local processing. Use a trusted computer and a locked screen."
          />

          <Link href={HOME_HREF}>Back to all tools</Link>
        </VStack>
      </Section>
    </VStack>
  );
}
