import {useMemo, useState} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {TextArea} from '@astryxdesign/core/TextArea';
import {SegmentedControl, SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';
import {Text} from '@astryxdesign/core/Text';
import {CodeBlock} from '@astryxdesign/core/CodeBlock';
import {Banner} from '@astryxdesign/core/Banner';
import {CopyButton} from '../components/CopyButton';
import {tomlToJson, jsonToToml} from '../lib/tomlConvert';

type Mode='toml2json'|'json2toml';

export default function TomlConverter(){
  const [mode,setMode]=useState<Mode>('toml2json');
  const [input,setInput]=useState('[server]\nhost = "localhost"\nport = 8080\n[database]\nurl = "postgres://user:pass@localhost/db"\nfeatures = ["offline","private"]');
  const result=useMemo(()=>{
    if(!input.trim()) return {output:'', error:null as string|null};
    return mode==='toml2json'? tomlToJson(input): jsonToToml(input);
  },[input,mode]);
  return (
    <VStack gap={4}>
      <Text type="supporting" display="block">Converta TOML ↔ JSON localmente — Cargo.toml, pyproject.toml sem vazar estrutura interna.</Text>
      <HStack gap={4} wrap="wrap" vAlign="end">
        <SegmentedControl label="Direção" value={mode} onChange={v=>setMode(v as Mode)}>
          <SegmentedControlItem value="toml2json" label="TOML → JSON" />
          <SegmentedControlItem value="json2toml" label="JSON → TOML" />
        </SegmentedControl>
        <CopyButton value={result.output} />
      </HStack>
      <TextArea label={mode==='toml2json'?'TOML input':'JSON input'} placeholder={mode==='toml2json'?'key = "value"':'{"key":"value"}'} value={input} onChange={setInput} rows={10} hasSpellCheck={false} status={result.error?{type:'error', message:result.error}:undefined} />
      {result.output && (
        <VStack gap={2}>
          <Text weight="semibold" display="block">Output</Text>
          <CodeBlock code={result.output} language={mode==='toml2json'?'json':'toml'} width="100%" maxHeight={380} hasLineNumbers hasCopyButton={false}/>
        </VStack>
      )}
      <Banner status="info" title="Local only" description="Parser cobre strings, números, booleanos, arrays e tables. Inline tables e datas TOML avançadas mostram limite honesto." />
    </VStack>
  );
}
