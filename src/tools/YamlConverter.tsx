import {useMemo, useState} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {TextArea} from '@astryxdesign/core/TextArea';
import {SegmentedControl, SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';
import {Text} from '@astryxdesign/core/Text';
import {CodeBlock} from '@astryxdesign/core/CodeBlock';
import {Banner} from '@astryxdesign/core/Banner';
import {CopyButton} from '../components/CopyButton';
import {yamlToJson, jsonToYaml} from '../lib/yamlConvert';

type Mode = 'yaml2json' | 'json2yaml';

export default function YamlConverter(){
  const [mode, setMode]=useState<Mode>('yaml2json');
  const [input,setInput]=useState('name: sTools\nversion: 1\nfeatures:\n  - offline\n  - private\ndatabase:\n  host: localhost\n  port: 5432');
  const result=useMemo(()=>{
    if(!input.trim()) return {output:'', error:null as string|null};
    return mode==='yaml2json' ? yamlToJson(input) : jsonToYaml(input);
  },[input,mode]);

  return (
    <VStack gap={4}>
      <Text type="supporting" display="block">Converta YAML ↔ JSON sem enviar configs para yamltojson.com. Segredos em <code>application.yaml</code> ficam neste tab.</Text>
      <HStack gap={4} wrap="wrap" vAlign="end">
        <SegmentedControl label="Direção" value={mode} onChange={v=>setMode(v as Mode)}>
          <SegmentedControlItem value="yaml2json" label="YAML → JSON" />
          <SegmentedControlItem value="json2yaml" label="JSON → YAML" />
        </SegmentedControl>
        <CopyButton value={result.output} />
      </HStack>
      <TextArea label={mode==='yaml2json'?'YAML input':'JSON input'} placeholder={mode==='yaml2json'?'key: value':'{"key":"value"}'} value={input} onChange={setInput} rows={10} hasSpellCheck={false} status={result.error?{type:'error', message: result.error}:undefined} />
      {result.output && (
        <VStack gap={2}>
          <Text weight="semibold" display="block">Output</Text>
          <CodeBlock code={result.output} language={mode==='yaml2json'?'json':'yaml'} width="100%" maxHeight={380} hasLineNumbers hasCopyButton={false} />
        </VStack>
      )}
      <Banner status="info" title="Privado" description="Conversão pura em memória. Limite honesto: parser cobre mappings, sequências e escalares comuns — YAML complexo (anchors/merge) pode exigir revisão." />
    </VStack>
  );
}
