import {useMemo, useState} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {TextArea} from '@astryxdesign/core/TextArea';
import {SegmentedControl, SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';
import {Text} from '@astryxdesign/core/Text';
import {CodeBlock} from '@astryxdesign/core/CodeBlock';
import {Banner} from '@astryxdesign/core/Banner';
import {CopyButton} from '../components/CopyButton';
import {xmlToJson, jsonToXml} from '../lib/xmlConvert';

type Mode='xml2json'|'json2xml';
export default function XmlConverter(){
  const [mode,setMode]=useState<Mode>('xml2json');
  const [input,setInput]=useState('<root>\n  <user id="1">\n    <name>Ana</name>\n    <email>ana@example.com</email>\n  </user>\n</root>');
  const result=useMemo(()=>{
    if(!input.trim()) return {output:'', error:null as string|null};
    return mode==='xml2json'? xmlToJson(input): jsonToXml(input);
  },[input,mode]);
  return (
    <VStack gap={4}>
      <Text type="supporting" display="block">Convert XML ↔ JSON offline — SOAP envelopes with PII stay in the browser. Uses native DOMParser.</Text>
      <HStack gap={4} wrap="wrap" vAlign="end">
        <SegmentedControl label="Direction" value={mode} onChange={v=>setMode(v as Mode)}>
          <SegmentedControlItem value="xml2json" label="XML → JSON" />
          <SegmentedControlItem value="json2xml" label="JSON → XML" />
        </SegmentedControl>
        <CopyButton value={result.output} />
      </HStack>
      <TextArea label={mode==='xml2json'?'XML input':'JSON input (single root)'} placeholder={mode==='xml2json'?'<root/>':'{"root":{"user":"..."}}'} value={input} onChange={setInput} rows={10} hasSpellCheck={false} status={result.error?{type:'error', message:result.error}:undefined} />
      {result.output && (
        <VStack gap={2}>
          <Text weight="semibold" display="block">Output</Text>
          <CodeBlock code={result.output} language={mode==='xml2json'?'json':'xml'} width="100%" maxHeight={420} hasLineNumbers hasCopyButton={false} />
        </VStack>
      )}
      <Banner status="info" title="Notes" description="Attributes become @attr, text goes into #text. JSON→XML requires a single root object. All in memory." />
    </VStack>
  );
}
