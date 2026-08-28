import {useMemo, useState} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {TextInput} from '@astryxdesign/core/TextInput';
import {Text} from '@astryxdesign/core/Text';
import {CodeBlock} from '@astryxdesign/core/CodeBlock';
import {Banner} from '@astryxdesign/core/Banner';
import {CopyButton} from '../components/CopyButton';
import {parseCron, buildCron, nextRuns} from '../lib/cron';

export default function CronBuilder(){
  const [minute,setMinute]=useState('0');
  const [hour,setHour]=useState('9');
  const [dom,setDom]=useState('*');
  const [month,setMonth]=useState('*');
  const [dow,setDow]=useState('MON');
  const [raw,setRaw]=useState('0 9 * * MON');
  const [useRaw,setUseRaw]=useState(false);

  const expr = useRaw ? raw : buildCron({minute,hour,dom,month,dow});
  const parsed=useMemo(()=> parseCron(expr),[expr]);
  const runs=useMemo(()=> parsed.valid ? nextRuns(expr,3): [],[expr,parsed.valid]);

  return (
    <VStack gap={4}>
      <Text type="supporting" display="block">Create and explain cron expressions without exposing business schedules. 5 fields (min hour dom month dow).</Text>
      <HStack gap={2} wrap="wrap" vAlign="end">
        <TextInput label="Minute (0-59)" value={minute} onChange={setMinute} width="110px" />
        <TextInput label="Hour (0-23)" value={hour} onChange={setHour} width="110px" />
        <TextInput label="Dom (1-31)" value={dom} onChange={setDom} width="110px" />
        <TextInput label="Month (1-12)" value={month} onChange={setMonth} width="110px" />
        <TextInput label="Dow (0-7/SUN..SAT)" value={dow} onChange={setDow} width="140px" />
        <CopyButton value={expr} />
      </HStack>
      <HStack gap={3} vAlign="center">
        <Text type="label" display="block">Expr:</Text>
        <CodeBlock code={expr} language="plaintext" width="220px" isWrapped hasCopyButton={false}/>
        <label style={{display:'flex',gap:6,alignItems:'center'}}><input type="checkbox" checked={useRaw} onChange={e=>setUseRaw(e.target.checked)} /> edit raw</label>
      </HStack>
      {useRaw && <TextInput label="Raw cron" value={raw} onChange={setRaw} placeholder="0 9 * * MON" />}
      <VStack gap={2}>
        <Text weight="semibold" display="block">Validation</Text>
        {parsed.valid ? (
          <>
            <Text type="supporting" display="block">✓ valid — {parsed.description}</Text>
            <Text type="supporting" display="block">Next 3 runs (next 7 days, local):</Text>
            <CodeBlock code={runs.join('\n') || '(nenhuma)'} language="plaintext" width="100%" isWrapped hasCopyButton={false}/>
          </>
        ) : (
          <Text type="supporting" display="block">✗ invalid — {parsed.error}</Text>
        )}
      </VStack>
      <Banner status="info" title="Tip" description="Use * for any, */15 for every 15, 1-5 for range, MON-FRI for names. All computed in the browser." />
    </VStack>
  );
}
