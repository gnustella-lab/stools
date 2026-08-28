import {useMemo, useState} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {TextInput} from '@astryxdesign/core/TextInput';
import {TextArea} from '@astryxdesign/core/TextArea';
import {Selector} from '@astryxdesign/core/Selector';
import {Text} from '@astryxdesign/core/Text';
import {CodeBlock} from '@astryxdesign/core/CodeBlock';
import {Banner} from '@astryxdesign/core/Banner';
import {CopyButton} from '../components/CopyButton';
import {buildHeaders, parseHeaders, headersToCurl, STATUS_CODES, authHeader} from '../lib/headerBuild';

export default function HeaderBuilder(){
  const [url,setUrl]=useState('https://api.example.com/data');
  const [rows,setRows]=useState<Array<{name:string,value:string}>>([{name:'Authorization',value:'Bearer ...'},{name:'Content-Type',value:'application/json'}]);
  const [raw,setRaw]=useState('Authorization: Bearer token123\nX-Request-Id: abc-123');
  const [status,setStatus]=useState('200');
  const [authKind,setAuthKind]=useState<'Basic'|'Bearer'|'ApiKey'>('Bearer');
  const [user,setUser]=useState('alice');
  const [pass,setPass]=useState('s3cret');
  const [token,setToken]=useState('eyJ...');

  const built=useMemo(()=> buildHeaders(rows),[rows]);
  const parsed=useMemo(()=> parseHeaders(raw),[raw]);
  const curl=useMemo(()=> headersToCurl(rows, url),[rows,url]);
  const statusInfo=useMemo(()=> STATUS_CODES[parseInt(status,10) as number], [status]);

  const authValue=useMemo(()=> authHeader(authKind, {username:user, password:pass, token}),[authKind,user,pass,token]);

  const updateRow=(i:number, field:'name'|'value', v:string)=> setRows(r=> r.map((row,idx)=> idx===i? {...row, [field]:v}:row));
  const addRow=()=> setRows(r=>[...r,{name:'',value:''}]);
  const delRow=(i:number)=> setRows(r=> r.filter((_,idx)=>idx!==i));

  return (
    <VStack gap={4}>
      <Text type="supporting" display="block">Build HTTP headers and look up status codes offline — without sending your <code>Authorization</code> to any service.</Text>
      <VStack gap={2}>
        <Text weight="semibold" display="block">Headers builder</Text>
        <TextInput label="URL for cURL" value={url} onChange={setUrl} placeholder="https://..." />
        {rows.map((r,i)=>(
          <HStack key={i} gap={2} vAlign="end">
            <TextInput label="Header" value={r.name} onChange={v=>updateRow(i,'name',v)} placeholder="X-Custom" width="180px" />
            <TextInput label="Value" value={r.value} onChange={v=>updateRow(i,'value',v)} width="260px" />
            <button onClick={()=>delRow(i)} style={{padding:'6px 10px', borderRadius:6, border:'1px solid #ccc', background:'#fff'}}>✕</button>
          </HStack>
        ))}
        <HStack gap={2}><button onClick={addRow} style={{padding:'6px 12px', borderRadius:6, border:'1px solid #111', background:'#fff'}}>+ Add header</button><CopyButton value={built} label="Copy headers" /></HStack>
        <CodeBlock code={built || '(vazio)'} language="plaintext" width="100%" isWrapped hasCopyButton={false}/>
        <CodeBlock code={curl} language="bash" width="100%" isWrapped hasCopyButton={false}/>
      </VStack>

      <VStack gap={2}>
        <Text weight="semibold" display="block">Parser (paste raw headers)</Text>
        <TextArea label="Raw headers" value={raw} onChange={setRaw} rows={4} hasSpellCheck={false} />
        {parsed.length>0 && <CodeBlock code={JSON.stringify(parsed,null,2)} language="json" width="100%" maxHeight={160} hasCopyButton={false}/>}
      </VStack>

      <VStack gap={2}>
        <Text weight="semibold" display="block">Auth helper</Text>
        <HStack gap={3} wrap="wrap" vAlign="end">
          <Selector label="Tipo" value={authKind} onChange={v=>setAuthKind(v as 'Basic'|'Bearer'|'ApiKey')} options={[{value:'Bearer',label:'Bearer'},{value:'Basic',label:'Basic'},{value:'ApiKey',label:'ApiKey'}]} />
          {authKind==='Basic' && (<><TextInput label="User" value={user} onChange={setUser} width="140px"/><TextInput label="Pass" value={pass} onChange={setPass} width="140px"/></>)}
          {authKind!=='Basic' && <TextInput label="Token" value={token} onChange={setToken} width="260px"/>}
          <CopyButton value={authValue} label="Copy auth" />
        </HStack>
        <CodeBlock code={authValue} language="plaintext" width="100%" isWrapped hasCopyButton={false}/>
      </VStack>

      <VStack gap={2}>
        <Text weight="semibold" display="block">Status Atlas</Text>
        <HStack gap={2} vAlign="end"><TextInput label="Code" value={status} onChange={setStatus} width="100px"/><Text display="block" type="supporting">{statusInfo? `${statusInfo.phrase} — ${statusInfo.description}`: 'Unknown'}</Text></HStack>
        <CodeBlock code={Object.entries(STATUS_CODES).map(([c,i])=> `${c} ${i.phrase} — ${i.description}`).join('\n')} language="plaintext" width="100%" maxHeight={160} isWrapped hasCopyButton={false}/>
      </VStack>

      <Banner status="info" title="Private" description="All via URL/URLSearchParams and string ops. No header is sent." />
    </VStack>
  );
}
