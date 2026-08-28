import { useCallback, useState } from 'react';
import { VStack, HStack } from '@astryxdesign/core/Layout';
import { TextArea } from '@astryxdesign/core/TextArea';
import { FileInput } from '@astryxdesign/core/FileInput';
import { Text } from '@astryxdesign/core/Text';
import { Banner } from '@astryxdesign/core/Banner';
import { Token } from '@astryxdesign/core/Token';
import { asFile } from '../lib/files';
import { inspectCertificate, isPemInput } from '../lib/cert';
import type { CertInfo } from '../lib/cert';

export default function CertInspector() {
  const [pem, setPem] = useState('-----BEGIN CERTIFICATE-----\nMIIB... (paste PEM)\n-----END CERTIFICATE-----');
  const [info, setInfo] = useState<CertInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const runPem = useCallback(async () => {
    setError(null);
    setInfo(null);
    try {
      if (!isPemInput(pem)) throw new Error('Paste a PEM block starting with -----BEGIN CERTIFICATE----- (or CSR for preview).');
      const r = await inspectCertificate(pem);
      setInfo(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [pem]);

  const onFile = useCallback(async (v: File | File[] | null) => {
    const f = asFile(v);
    setFile(f);
    setError(null);
    setInfo(null);
    if (!f) return;
    try {
      const text = await f.text();
      const r = isPemInput(text)
        ? await inspectCertificate(text)
        : await inspectCertificate(new Uint8Array(await f.arrayBuffer()));
      setInfo(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  return (
    <VStack gap={4}>
      <Text type="supporting" display="block">
        Decode X.509 certificates locally: subject, SAN, validity, signature and public key algorithms, and SHA-256 fingerprint — via Web Crypto. Nothing is sent to OCSP/CRL.
      </Text>

      <TextArea label="PEM" placeholder="-----BEGIN CERTIFICATE-----" value={pem} onChange={setPem} rows={6} hasSpellCheck={false} />
      <HStack gap={2}>
        <button onClick={() => void runPem()} style={{ padding: '8px 16px', borderRadius: 'var(--radius-control)', background: 'var(--color-background-accent)', color: 'white', border: 'none', cursor: 'pointer' }}>Inspect PEM</button>
        <FileInput label="Or certificate file" accept=".pem,.crt,.cer,.csr" value={file} onChange={onFile} />
      </HStack>

      {error && <Banner status="error" title="Error" description={error} />}

      {info && (
        <VStack gap={3}>
          <HStack gap={2} wrap="wrap">
            <Token label={info.isExpired ? 'EXPIRED' : info.isNotYetValid ? 'NOT YET VALID' : 'Time OK'} size="sm" color={info.isExpired ? 'red' : info.isNotYetValid ? 'orange' : 'green'} />
            {info.sigAlg && <Token label={info.sigAlg} size="sm" />}
            {info.publicKeyAlg && <Token label={info.publicKeyAlg} size="sm" />}
            {info.keySizeHint && <Token label={info.keySizeHint} size="sm" />}
          </HStack>

          <VStack gap={1}>
            <Text weight="semibold" display="block">Subject</Text>
            <Text type="code" display="block" wordBreak="break-all">{info.subject}</Text>
            <Text weight="semibold" display="block">Issuer</Text>
            <Text type="code" display="block" wordBreak="break-all">{info.issuer}</Text>
          </VStack>

          <HStack gap={4} wrap="wrap">
            <VStack gap={1}>
              <Text type="label" display="block">Not Before</Text>
              <Text type="code" display="block">{info.notBefore ?? '—'}</Text>
            </VStack>
            <VStack gap={1}>
              <Text type="label" display="block">Not After</Text>
              <Text type="code" display="block">{info.notAfter ?? '—'}</Text>
            </VStack>
          </HStack>

          {info.san.length > 0 && (
            <VStack gap={1}>
              <Text weight="semibold" display="block">SANs ({info.san.length})</Text>
              <HStack gap={2} wrap="wrap">
                {info.san.map(s => (
                  <Token key={s} label={s} size="sm" />
                ))}
              </HStack>
            </VStack>
          )}

          <VStack gap={1}>
            <Text type="label" display="block">SHA-256 Fingerprint</Text>
            <Text type="code" display="block" wordBreak="break-all">{info.fingerprintSha256}</Text>
          </VStack>

          {info.warnings.map((w, i) => (
            <Banner key={i} status="warning" title="Note" description={w} />
          ))}

          <Banner status="info" title="Honest limits" description="Heuristic parser — extracts fields from cleartext blobs, not a full ASN.1 validator. Does not verify chain, revocation (OCSP/CRL), or name constraints. For formal validation use openssl locally." />
        </VStack>
      )}
    </VStack>
  );
}
