import {useMemo, useState} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {TextArea} from '@astryxdesign/core/TextArea';
import {SegmentedControl, SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';
import {Switch} from '@astryxdesign/core/Switch';
import {Text} from '@astryxdesign/core/Text';
import {CodeBlock} from '@astryxdesign/core/CodeBlock';
import {Banner} from '@astryxdesign/core/Banner';
import {CopyButton} from '../components/CopyButton';
import {envToJson, jsonToEnv, envToYaml, yamlToEnv} from '../lib/envTranscode';

type Mode='env2json'|'json2env'|'env2yaml'|'yaml2env';
export default function EnvTranscoder(){
  const [mode,setMode]=useState<Mode>('env2json');
  const [withExport,setWithExport]=useState(false);
  const [input,setInput]=useState('DATABASE_URL=postgres://user:pass@localhost/db\nAPI_KEY=sk-1234567890abcdef\nPORT=3000\n# comentário\n');
  const result=useMemo(()=>{
    if(!input.trim()) return {output:'', error:null as string|null};
    if(mode==='env2json') return envToJson(input);
    if(mode==='json2env') return jsonToEnv(input, withExport);
    if(mode==='env2yaml') return envToYaml(input);
    return yamlToEnv(input);
  },[input,mode,withExport]);
  const labels: Record<Mode,string>={env2json:' .env → JSON', json2env:' JSON → .env', env2yaml:' .env → YAML', yaml2env:' YAML → .env'};
  return (
    <VStack gap={4}>
      <Text type="supporting" display="block">Transcodifique .env ↔ JSON ↔ YAML sem expor secrets. Arquivos ficam no tab — complemente com Env Scrubber para mascarar.</Text>
      <HStack gap={3} wrap="wrap" vAlign="end">
        <SegmentedControl label="Direção" value={mode} onChange={v=>setMode(v as Mode)}>
          <SegmentedControlItem value="env2json" label=".env → JSON" />
          <SegmentedControlItem value="json2env" label="JSON → .env" />
          <SegmentedControlItem value="env2yaml" label=".env → YAML" />
          <SegmentedControlItem value="yaml2env" label="YAML → .env" />
        </SegmentedControl>
        {mode==='json2env' && <Switch label="com export" value={withExport} onChange={setWithExport} />}
        <CopyButton value={result.output} />
      </HStack>
      <TextArea label={`Input ${labels[mode]}`} value={input} onChange={setInput} rows={8} hasSpellCheck={false} status={result.error?{type:'error', message:result.error}:undefined} />
      {result.output && (
        <VStack gap={2}>
          <Text weight="semibold" display="block">Output</Text>
          <CodeBlock code={result.output} language={mode.includes('json')?'json':'plaintext'} width="100%" maxHeight={340} hasLineNumbers hasCopyButton={false}/>
        </VStack>
      )}
      <Banner status="warning" title="Segurança" description="Este transcoder preserva valores — não mascara. Use Env Scrubber antes de compartilhar." />
    </VStack>
  );
}
