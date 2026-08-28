import {useMemo, useState} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {TextArea} from '@astryxdesign/core/TextArea';
import {Text} from '@astryxdesign/core/Text';
import {Token} from '@astryxdesign/core/Token';
import {CodeBlock} from '@astryxdesign/core/CodeBlock';
import {Banner} from '@astryxdesign/core/Banner';
import {CopyButton} from '../components/CopyButton';
import {diffJson} from '../lib/jsonDiff';

export default function JsonDiff(){
  const [a,setA]=useState('{\n  "name":"Ana",\n  "age":30,\n  "tags":["dev","js"],\n  "address":{"city":"SP","zip":"01001"}\n}');
  const [b,setB]=useState('{\n  "name":"Ana",\n  "age":31,\n  "tags":["dev","ts"],\n  "address":{"city":"SP","zip":"01002","country":"BR"}\n}');
  const res=useMemo(()=> diffJson(a,b),[a,b]);
  const summary=useMemo(()=>{
    const added=res.diffs.filter(d=>d.type==='added').length;
    const removed=res.diffs.filter(d=>d.type==='removed').length;
    const changed=res.diffs.filter(d=>d.type==='changed').length;
    return {added, removed, changed, total: res.diffs.length};
  },[res.diffs]);
  return (
    <VStack gap={4}>
      <Text type="supporting" display="block">Compare JSONs estruturalmente — ideal para diff de configs prod vs staging sem subir dados reais.</Text>
      <HStack gap={4} wrap="wrap">
        <VStack gap={2} style={{flex:1, minWidth:300}}><TextArea label="JSON A" value={a} onChange={setA} rows={10} hasSpellCheck={false} /></VStack>
        <VStack gap={2} style={{flex:1, minWidth:300}}><TextArea label="JSON B" value={b} onChange={setB} rows={10} hasSpellCheck={false} /></VStack>
      </HStack>
      {res.error? <Text color="accent" display="block">{res.error}</Text> : (
        <>
          <HStack gap={2} wrap="wrap" vAlign="center">
            <Token label={`${summary.total} diff(s)`} size="sm" color={summary.total? 'orange':'green'} />
            <Token label={`${summary.added} added`} size="sm" color="green" />
            <Token label={`${summary.removed} removed`} size="sm" color="red" />
            <Token label={`${summary.changed} changed`} size="sm" color="orange" />
            <CopyButton value={JSON.stringify(res.diffs,null,2)} />
          </HStack>
          {res.diffs.length===0? <Text type="supporting" display="block">Sem diferenças estruturais.</Text> : (
            <VStack gap={2}>
              {res.diffs.map((d,i)=>(
                <HStack key={i} gap={2} wrap="wrap" vAlign="center">
                  <Token label={d.type} size="sm" color={d.type==='added'?'green': d.type==='removed'?'red':'orange'} />
                  <Text type="code" display="block">{d.path}</Text>
                  {d.type==='changed' && <Text type="supporting" display="block">{JSON.stringify(d.oldValue)} → {JSON.stringify(d.newValue)}</Text>}
                  {d.type==='added' && <Text type="supporting" display="block">+ {JSON.stringify(d.newValue)}</Text>}
                  {d.type==='removed' && <Text type="supporting" display="block">- {JSON.stringify(d.oldValue)}</Text>}
                </HStack>
              ))}
              <CodeBlock code={JSON.stringify(res.diffs,null,2)} language="json" width="100%" maxHeight={300} hasLineNumbers hasCopyButton={false}/>
            </VStack>
          )}
        </>
      )}
      <Banner status="info" title="Ordem indiferente" description="Objetos são comparados por chaves (sem ordem). Arrays por índice. Sem rede." />
    </VStack>
  );
}
