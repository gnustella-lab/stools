import {useMemo, useState} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {TextArea} from '@astryxdesign/core/TextArea';
import {SegmentedControl, SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';
import {Text} from '@astryxdesign/core/Text';
import {CodeBlock} from '@astryxdesign/core/CodeBlock';
import {Banner} from '@astryxdesign/core/Banner';
import {CopyButton} from '../components/CopyButton';
import {parseCurl, curlToFetch, curlToPython, curlToGo} from '../lib/curlCodegen';

type Target='fetch'|'python'|'go';
export default function CurlCodegen(){
  const [input,setInput]=useState(`curl -X POST "https://api.example.com/users" \\\n  -H "Authorization: Bearer superSecretToken123" \\\n  -H "Content-Type: application/json" \\\n  -d '{"name":"Ana","email":"ana@example.com"}'`);
  const [target,setTarget]=useState<Target>('fetch');
  const parsed=useMemo(()=> parseCurl(input),[input]);
  const output=useMemo(()=>{
    if(!parsed) return '';
    if(target==='fetch') return curlToFetch(parsed);
    if(target==='python') return curlToPython(parsed);
    return curlToGo(parsed);
  },[parsed,target]);

  return (
    <VStack gap={4}>
      <Text type="supporting" display="block">Converta cURL → fetch / Python requests / Go http sem mandar seu <code>Authorization</code> para curlconverter.com.</Text>
      <TextArea label="cURL" placeholder='curl -H "Authorization: Bearer ..." https://...' value={input} onChange={setInput} rows={6} hasSpellCheck={false} status={!parsed && input.trim()?{type:'error', message:'Não foi possível extrair URL — verifique o comando'}:undefined} />
      {parsed && (
        <VStack gap={1}>
          <Text type="supporting" display="block">Detectado: <b>{parsed.method}</b> {parsed.url} — {Object.keys(parsed.headers).length} header(s){parsed.data? ` — body ${parsed.data.slice(0,40)}`:''}</Text>
        </VStack>
      )}
      <HStack gap={3} wrap="wrap" vAlign="end">
        <SegmentedControl label="Alvo" value={target} onChange={v=>setTarget(v as Target)}>
          <SegmentedControlItem value="fetch" label="JS fetch" />
          <SegmentedControlItem value="python" label="Python" />
          <SegmentedControlItem value="go" label="Go" />
        </SegmentedControl>
        <CopyButton value={output} />
      </HStack>
      {output && <CodeBlock code={output} language={target==='python'?'python': target==='go'?'go':'javascript'} width="100%" maxHeight={380} hasLineNumbers hasCopyButton={false} />}
      <Banner status="info" title="Privado" description="Parsing via regex neste tab. Combine com cURL Scrubber para redigir secrets antes de compartilhar." />
    </VStack>
  );
}
