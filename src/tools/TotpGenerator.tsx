import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {TextInput} from '@astryxdesign/core/TextInput';
import {SegmentedControl, SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';
import {Text} from '@astryxdesign/core/Text';
import {Banner} from '@astryxdesign/core/Banner';
import {ProgressBar} from '@astryxdesign/core/ProgressBar';
import {CopyButton} from '../components/CopyButton';
import {computeTotp, type TotpAlgorithm} from '../lib/totp';

interface OtpAuthParts {
  secret: string;
  digits: 6 | 8;
  period: number;
  algorithm: TotpAlgorithm;
  label: string | null;
}

function parseOtpAuth(input: string): OtpAuthParts | null {
  const trimmed = input.trim();
  if (!trimmed.toLowerCase().startsWith('otpauth://')) {
    return null;
  }
  try {
    const url = new URL(trimmed);
    const secret = url.searchParams.get('secret') ?? '';
    const digits = Number(url.searchParams.get('digits') ?? '6');
    const period = Number(url.searchParams.get('period') ?? '30');
    const algorithm = (url.searchParams.get('algorithm') ?? 'SHA1').toUpperCase();
    return {
      secret,
      digits: digits === 8 ? 8 : 6,
      period: period > 0 ? period : 30,
      algorithm:
        algorithm === 'SHA256' || algorithm === 'SHA512' ? (algorithm as TotpAlgorithm) : 'SHA1',
      label: decodeURIComponent(url.pathname.replace(/^\/+/, '')) || null,
    };
  } catch {
    return null;
  }
}

interface ManualState {
  secret: string;
  digits: '6' | '8';
  period: string;
  algorithm: TotpAlgorithm;
}

function toParams(manual: ManualState) {
  return {
    secret: manual.secret,
    digits: manual.digits === '8' ? (8 as const) : (6 as const),
    period: Math.max(1, Math.floor(Number(manual.period) || 30)),
    algorithm: manual.algorithm,
  };
}

export default function TotpGenerator() {
  const [input, setInput] = useState('');
  const [manual, setManual] = useState<ManualState>({
    secret: '',
    digits: '6',
    period: '30',
    algorithm: 'SHA1',
  });
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState(30);

  // An otpauth:// paste overrides the manual fields. A bare Base32 secret is
  // treated as the secret itself, keeping the manual digits/period/algorithm.
  useEffect(() => {
    const parsed = parseOtpAuth(input);
    if (parsed) {
      setManual({
        secret: parsed.secret,
        digits: String(parsed.digits) as '6' | '8',
        period: String(parsed.period),
        algorithm: parsed.algorithm,
      });
      return;
    }
    const bare = input.trim();
    setManual(prev => (prev.secret === bare ? prev : {...prev, secret: bare}));
  }, [input]);

  const params = useMemo(() => toParams(manual), [manual]);

  const tickRef = useRef(false);
  const tick = useCallback(async () => {
    if (tickRef.current) return;
    tickRef.current = true;
    try {
      if (!params.secret.trim()) {
        setCode(null);
        setError(null);
        return;
      }
      const result = await computeTotp(params, Date.now());
      setCode(result.code);
      setSecondsRemaining(result.secondsRemaining);
      setError(null);
    } catch (e) {
      setCode(null);
      setError(e instanceof Error ? e.message : 'Could not compute the code.');
    } finally {
      tickRef.current = false;
    }
  }, [params]);

  useEffect(() => {
    void tick();
    const interval = window.setInterval(() => void tick(), 250);
    return () => window.clearInterval(interval);
  }, [tick]);

  const uriLabel = parseOtpAuth(input)?.label ?? null;

  return (
    <VStack gap={4}>
      <TextInput
        label="otpauth:// URI or Base32 secret"
        placeholder="otpauth://totp/Acme:me@acme.com?secret=JBSW… or JBSWY3DPEHPK3PXP"
        value={input}
        onChange={setInput}
        hasClear
        width="100%"
      />

      <HStack gap={3} wrap="wrap" vAlign="end">
        <SegmentedControl
          label="Digits"
          value={manual.digits}
          onChange={value => setManual(prev => ({...prev, digits: value as '6' | '8'}))}
          layout="hug"
        >
          <SegmentedControlItem value="6" label="6 digits" />
          <SegmentedControlItem value="8" label="8 digits" />
        </SegmentedControl>
        <SegmentedControl
          label="Hash"
          value={manual.algorithm}
          onChange={value =>
            setManual(prev => ({...prev, algorithm: value as TotpAlgorithm}))
          }
          layout="hug"
        >
          <SegmentedControlItem value="SHA1" label="SHA-1" />
          <SegmentedControlItem value="SHA256" label="SHA-256" />
          <SegmentedControlItem value="SHA512" label="SHA-512" />
        </SegmentedControl>
        <TextInput
          label="Period (seconds)"
          value={manual.period}
          onChange={value => setManual(prev => ({...prev, period: value}))}
          width={140}
        />
      </HStack>

      {error && (
        <Banner status="error" title="Invalid secret" description={error} />
      )}

      {code ? (
        <VStack gap={2}>
          <Text type="code" display="block" style={{fontSize: '2.5rem', letterSpacing: '0.12em', fontWeight: 600}}>
            {code.slice(0, Math.ceil(code.length / 2))} {code.slice(Math.ceil(code.length / 2))}
          </Text>
          <HStack gap={2} vAlign="center">
            <CopyButton value={code} label="Copy code" />
            <Text type="supporting" display="block">
              Expires in {secondsRemaining}s
            </Text>
          </HStack>
          <ProgressBar
            label="Time remaining in this code"
            isLabelHidden
            value={secondsRemaining}
            max={params.period}
          />
          {uriLabel && (
            <Text type="supporting" display="block">
              Account from URI: {uriLabel}
            </Text>
          )}
        </VStack>
      ) : (
        !error && (
          <Text type="supporting" display="block">
            Paste the setup key your service showed when you chose "enter manually"
            instead of scanning a QR code. The code refreshes automatically.
          </Text>
        )
      )}

      <Text type="supporting" display="block">
        The shared secret stays in this tab and codes are derived with Web Crypto
        HMAC. Nothing is synced or stored - closing the tab forgets everything.
      </Text>
    </VStack>
  );
}
