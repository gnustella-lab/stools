import {useEffect, useMemo, useState} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {TextArea} from '@astryxdesign/core/TextArea';
import {TextInput} from '@astryxdesign/core/TextInput';
import {Button} from '@astryxdesign/core/Button';
import {Text} from '@astryxdesign/core/Text';
import {Banner} from '@astryxdesign/core/Banner';
import {CodeBlock} from '@astryxdesign/core/CodeBlock';
import {SegmentedControl, SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';
import {CopyButton} from '../components/CopyButton';
import {base64ToBytes, bytesToBase64} from '../lib/bytes';
import {decryptPayload, encryptPayload} from '../lib/crypto';

type Mode = 'seal' | 'open';

function buildShareUrl(envelopeB64: string): string {
  const url = new URL(window.location.href);
  url.hash = `#/tool/paste-vault#${envelopeB64}`;
  return url.toString();
}

function extractFragment(): string | null {
  const hash = window.location.hash;
  const idx = hash.indexOf('#', '#/tool/paste-vault'.length);
  if (idx === -1) return null;
  const frag = hash.slice(idx + 1);
  return frag || null;
}

export default function PasteVault() {
  const [mode, setMode] = useState<Mode>('seal');
  const [passphrase, setPassphrase] = useState('');
  const [plain, setPlain] = useState('');
  const [envelope, setEnvelope] = useState('');
  const [output, setOutput] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const hasFragment = useMemo(() => Boolean(extractFragment()), []);

  useEffect(() => {
    const frag = extractFragment();
    if (frag) {
      setEnvelope(frag);
      setMode('open');
    }
  }, []);

  const seal = async () => {
    setBusy(true);
    setError(null);
    setNote(null);
    setOutput('');
    setShareUrl('');
    try {
      if (!passphrase) throw new Error('Enter a passphrase to seal the note.');
      if (!plain) throw new Error('Enter the text you want to seal.');
      const bytes = new TextEncoder().encode(plain);
      const enc = await encryptPayload(bytes, passphrase, 'vault.txt');
      const b64 = bytesToBase64(enc);
      setOutput(b64);
      setShareUrl(buildShareUrl(b64));
      setNote(
        'Sealed locally with AES-256-GCM + PBKDF2 (210,000 iterations). Share the URL and send the passphrase through a different channel - anyone with both can open it.',
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not seal.');
    } finally {
      setBusy(false);
    }
  };

  const open = async () => {
    setBusy(true);
    setError(null);
    setNote(null);
    setOutput('');
    try {
      if (!passphrase) throw new Error('Enter the passphrase used to seal.');
      if (!envelope) throw new Error('Paste the Base64 envelope or open a share URL.');
      const raw = envelope.trim().startsWith('http') ? (extractFragmentFromUrl(envelope) ?? envelope) : envelope.trim();
      const payload = base64ToBytes(raw);
      const result = await decryptPayload(payload, passphrase);
      const text = new TextDecoder().decode(result.bytes);
      setOutput(text);
      setNote(`Opened ${result.bytes.length} bytes of plaintext. The envelope was decrypted in memory and never sent.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open. Check passphrase and envelope.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <VStack gap={4}>
      <Text color="secondary" display="block" textWrap="pretty">
        Seal a note with a passphrase and share it as a self-contained link fragment. The ciphertext lives in the URL
        after <Text type="code">#</Text> - fragments are never sent to a server and decryption happens entirely in this
        tab with <Text type="code">AES-GCM</Text>.
      </Text>

      <SegmentedControl label="Mode" value={mode} onChange={v => setMode(v as Mode)}>
        <SegmentedControlItem value="seal" label="Seal" />
        <SegmentedControlItem value="open" label="Open" />
      </SegmentedControl>

      {hasFragment && mode === 'open' && (
        <Banner status="info" title="Share link detected" description="A vault fragment was found in the URL. Enter the passphrase to open it." />
      )}

      <TextInput
        label="Passphrase"
        type="password"
        value={passphrase}
        onChange={setPassphrase}
        placeholder="A long, unique passphrase"
        description="Derived locally with PBKDF2 (210,000 iterations). Never stored, never transmitted."
        width="100%"
      />

      {mode === 'seal' ? (
        <TextArea
          label="Secret to seal"
          placeholder="Paste the note, token, or message you want to share securely…"
          value={plain}
          onChange={setPlain}
          rows={7}
          hasSpellCheck={false}
        />
      ) : (
        <TextArea
          label="Envelope (Base64 or share URL)"
          placeholder="Paste the Base64 envelope or the full share URL containing #fragment…"
          value={envelope}
          onChange={setEnvelope}
          rows={7}
          hasSpellCheck={false}
        />
      )}

      <HStack gap={3} wrap="wrap" vAlign="center">
        <Button
          label={mode === 'seal' ? 'Seal' : 'Open'}
          variant="primary"
          onClick={() => void (mode === 'seal' ? seal() : open())}
          isLoading={busy}
          isDisabled={!passphrase || (mode === 'seal' ? !plain : !envelope)}
        />
        {output && <CopyButton value={mode === 'seal' ? shareUrl || output : output} />}
      </HStack>

      {error && <Banner status="error" title="Operation failed" description={error} />}
      {note && !error && <Banner status="success" title="Done" description={note} />}

      {output && mode === 'seal' && (
        <VStack gap={2}>
          <Text weight="semibold" display="block">
            Share URL (fragment holds the ciphertext)
          </Text>
          <CodeBlock code={shareUrl} language="plaintext" width="100%" isWrapped hasCopyButton={false} />
          <Text type="supporting" display="block" textWrap="pretty">
            Send this URL and the passphrase separately (e.g., URL via chat, passphrase via call). Anyone with the link
            still needs the passphrase; a wrong one fails closed.
          </Text>
          <Text weight="semibold" display="block">
            Envelope (Base64)
          </Text>
          <CodeBlock code={output} language="plaintext" width="100%" maxHeight={260} isWrapped hasCopyButton={false} />
        </VStack>
      )}

      {output && mode === 'open' && (
        <VStack gap={2}>
          <Text weight="semibold" display="block">
            Plaintext
          </Text>
          <CodeBlock code={output} language="plaintext" width="100%" maxHeight={360} isWrapped hasCopyButton={false} />
        </VStack>
      )}

      <Text type="supporting" display="block" textWrap="pretty">
        Security note: URL fragments stay client-side per the URL spec and are not sent in HTTP requests, but they do
        remain in browser history. For highly sensitive notes, prefer sharing the raw Base64 envelope instead of the URL.
      </Text>
    </VStack>
  );
}

function extractFragmentFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const hash = u.hash;
    const idx = hash.indexOf('#', 1);
    if (idx !== -1) return hash.slice(idx + 1);
    // single hash is the fragment itself if it is base64-like
    if (hash.startsWith('#') && hash.length > 20) {
      const maybe = hash.slice(1);
      if (!maybe.includes('/') && maybe.length > 20) return maybe;
    }
    return null;
  } catch {
    return null;
  }
}
