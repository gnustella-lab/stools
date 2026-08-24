import {useEffect, useState} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {TextInput} from '@astryxdesign/core/TextInput';
import {Button} from '@astryxdesign/core/Button';
import {Text} from '@astryxdesign/core/Text';
import {Heading} from '@astryxdesign/core/Heading';
import {OutputRow} from '../components/OutputRow';

function parseTimestamp(raw: string): Date | null {
  const trimmed = raw.trim();
  if (!/^-?\d+$/.test(trimmed)) return null;
  const n = Number(trimmed);
  const ms = Math.abs(n) >= 1e12 ? n : n * 1000;
  const date = new Date(ms);
  return Number.isNaN(date.getTime()) ? null : date;
}

export default function TimestampConverter() {
  const [unixInput, setUnixInput] = useState('');
  const [dateInput, setDateInput] = useState('');
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const parsedDate = parseTimestamp(unixInput);
  const unixValid = unixInput.trim() !== '' && parsedDate !== null;

  const parsedUnixFromDate = (() => {
    const trimmed = dateInput.trim();
    if (!trimmed) return null;
    const direct = Number(trimmed);
    if (/^-?\d+(\.\d+)?$/.test(trimmed) && Number.isFinite(direct)) {
      return null;
    }
    const date = new Date(trimmed);
    return Number.isNaN(date.getTime()) ? null : date;
  })();
  const dateValid = dateInput.trim() !== '' && parsedUnixFromDate !== null;

  return (
    <VStack gap={6}>
      <VStack gap={3}>
        <HStack gap={3} vAlign="center">
          <Heading level={3}>Timestamp to date</Heading>
          <Text type="supporting" display="block">
            Seconds or milliseconds
          </Text>
        </HStack>
        <TextInput
          label="Unix timestamp"
          placeholder={String(Math.floor(now.getTime() / 1000))}
          value={unixInput}
          onChange={setUnixInput}
          hasClear
          status={
            !unixValid && unixInput.trim() !== ''
              ? {type: 'error' as const, message: 'Enter a number in seconds (10 digits) or milliseconds (13 digits).'}
              : undefined
          }
        />
        {parsedDate && (
          <VStack gap={2}>
            <OutputRow label="ISO 8601 (UTC)" value={parsedDate.toISOString()} />
            <OutputRow label="UTC string" value={parsedDate.toUTCString()} />
            <OutputRow label="Local time" value={parsedDate.toString()} />
            <OutputRow
              label="Relative"
              value={relativeTime(parsedDate, now)}
            />
          </VStack>
        )}
      </VStack>

      <VStack gap={3}>
        <Heading level={3}>Date to timestamp</Heading>
        <TextInput
          label="Date string"
          description="ISO 8601 works best: 2026-08-22T14:30:00Z - most human-readable formats also parse."
          placeholder={now.toISOString()}
          value={dateInput}
          onChange={setDateInput}
          hasClear
          status={
            !dateValid && dateInput.trim() !== ''
              ? {type: 'error' as const, message: 'Could not parse this as a date.'}
              : undefined
          }
        />
        {parsedUnixFromDate && (
          <VStack gap={2}>
            <OutputRow
              label="Seconds"
              value={String(Math.floor(parsedUnixFromDate.getTime() / 1000))}
            />
            <OutputRow label="Milliseconds" value={String(parsedUnixFromDate.getTime())} />
            <OutputRow label="ISO 8601 (UTC)" value={parsedUnixFromDate.toISOString()} />
          </VStack>
        )}
      </VStack>

      <VStack gap={3}>
        <Heading level={3}>Current time</Heading>
        <HStack gap={3} wrap="wrap" vAlign="center">
          <Button
            label="Use current time as input"
            variant="secondary"
            onClick={() => setUnixInput(String(Math.floor(Date.now() / 1000)))}
          />
          <Text type="supporting" display="block">
            Now: {now.toISOString().replace('T', ' ').replace('Z', ' UTC')} · epoch{' '}
            {Math.floor(now.getTime() / 1000)} s
          </Text>
        </HStack>
      </VStack>
    </VStack>
  );
}

function relativeTime(target: Date, reference: Date): string {
  const diffSeconds = Math.round((target.getTime() - reference.getTime()) / 1000);
  const abs = Math.abs(diffSeconds);
  const steps: [number, number, string][] = [
    [60, 1, 'second'],
    [3600, 60, 'minute'],
    [86400, 3600, 'hour'],
    [2592000, 86400, 'day'],
    [31536000, 2592000, 'month'],
    [Infinity, 31536000, 'year'],
  ];
  let value = abs;
  let unit = 'second';
  for (const [threshold, divisor, name] of steps) {
    if (abs < threshold) break;
    value = abs / divisor;
    unit = name;
  }
  const rounded = Math.round(value);
  const plural = rounded === 1 ? unit : `${unit}s`;
  return diffSeconds >= 0 ? `in ${rounded} ${plural}` : `${rounded} ${plural} ago`;
}
