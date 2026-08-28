import {useMemo, useState} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {TextInput} from '@astryxdesign/core/TextInput';
import {TextArea} from '@astryxdesign/core/TextArea';
import {Text} from '@astryxdesign/core/Text';
import {CodeBlock} from '@astryxdesign/core/CodeBlock';
import {Banner} from '@astryxdesign/core/Banner';
import {CopyButton} from '../components/CopyButton';
import {parseQuery, buildQuery, buildUrl} from '../lib/queryString';

export default function QueryBuilder(){
  const [base,setBase]=useState('https://api.example.com/search');
  const [rows,setRows]=useState<Array<{key:string,value:string}>>([{key:'q',value:'hello world'},{key:'page',value:'1'},{key:'token',value:'secret123'}]);
  const [raw,setRaw]=useState('https://api.example.com/search?q=hello%20world&page=1&token=secret123');

  const parsed=useMemo(()=> parseQuery(raw),[raw]);
  const built=useMemo(()=> buildUrl(base, rows),[base,rows]);
  const queryOnly=useMemo(()=> buildQuery(rows),[rows]);

  const updateRow=(i:number, field:'key'|'value', v:string)=>{
    setRows(r=> r.map((row, idx)=> idx===i? {...row, [field]:v}:row));
  };
  const addRow=()=> setRows(r=>[...r,{key:'',value:''}]);
  const delRow=(i:number)=> setRows(r=> r.filter((_,idx)=>idx!==i));

  return (
    <VStack gap={4}>
      <Text type="supporting" display="block">Build and parse query strings locally — URLs with tokens do not need to go to urldecoder.org.</Text>
      <VStack gap={2}>
        <Text weight="semibold" display="block">Builder</Text>
        <TextInput label="Base URL" value={base} onChange={setBase} placeholder="https://api.example.com/search" />
        {rows.map((r,i)=>(
          <HStack key={i} gap={2} vAlign="end">
            <TextInput label={`Key ${i+1}`} value={r.key} onChange={v=>updateRow(i,'key',v)} placeholder="q" width="160px" />
            <TextInput label="Value" value={r.value} onChange={v=>updateRow(i,'value',v)} placeholder="hello" width="220px" />
            <button onClick={()=>delRow(i)} style={{padding:'6px 10px', borderRadius:6, border:'1px solid #ccc', background:'#fff'}}>✕</button>
          </HStack>
        ))}
        <HStack gap={2}><button onClick={addRow} style={{padding:'6px 12px', borderRadius:6, border:'1px solid #111', background:'#fff'}}> + Add param</button><CopyButton value={built} label="Copy URL" /></HStack>
        <CodeBlock code={built} language="plaintext" width="100%" isWrapped hasCopyButton={false} />
        <CodeBlock code={queryOnly || '(empty)'} language="plaintext" width="100%" isWrapped hasCopyButton={false} />
      </VStack>
      <VStack gap={2}>
        <Text weight="semibold" display="block">Parser (paste URL or ?q=...)</Text>
        <TextArea label="URL / Query raw" value={raw} onChange={setRaw} rows={3} hasSpellCheck={false} status={parsed.error?{type:'error', message:parsed.error}:undefined} />
        {parsed.entries.length>0 && (
          <VStack gap={1}>
            {parsed.entries.map((e,i)=>(
              <HStack key={i} gap={2} wrap="wrap"><Text type="code" display="block">{e.key}</Text><Text display="block">=</Text><Text type="code" display="block">{e.value}</Text><Text type="supporting" display="block">({e.encodedKey}={e.encodedValue})</Text></HStack>
            ))}
          </VStack>
        )}
      </VStack>
      <Banner status="info" title="Encoding" description="Uses native URLSearchParams — correct encodeURIComponent, no surprises." />
    </VStack>
  );
}
