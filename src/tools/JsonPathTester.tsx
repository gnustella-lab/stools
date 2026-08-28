import {useMemo, useState} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {TextArea} from '@astryxdesign/core/TextArea';
import {TextInput} from '@astryxdesign/core/TextInput';
import {Text} from '@astryxdesign/core/Text';
import {CodeBlock} from '@astryxdesign/core/CodeBlock';
import {Banner} from '@astryxdesign/core/Banner';
import {Token} from '@astryxdesign/core/Token';
import {CopyButton} from '../components/CopyButton';
import {evaluateJsonPath} from '../lib/jsonPath';

export default function JsonPathTester(){
  const [json,setJson]=useState('{\n  "store": {\n    "book": [\n      {"title":"A","price":10},\n      {"title":"B","price":30}\n    ]\n  }\n}');
  const [path,setPath]=useState('$.store.book[*].title');
  const result=useMemo(()=> evaluateJsonPath(json,path),[json,path]);
  return (
    <VStack gap={4}>
      <Text type="supporting" display="block">Teste JSONPath / JMESPath simples sem colar JSON de clientes em jsonpath.com. Tudo local.</Text>
      <TextArea label="JSON" placeholder='{"store":{...}}' value={json} onChange={setJson} rows={10} hasSpellCheck={false} status={result.error && json.trim() ? {type:'error', message: result.error}:undefined} />
      <HStack gap={3} wrap="wrap" vAlign="end">
        <TextInput label="JSONPath" placeholder="$.store.book[*].title" value={path} onChange={setPath} width="100%" status={result.error?{type:'error', message: result.error}:undefined} />
        <CopyButton value={result.pretty ?? ''} />
      </HStack>
      <HStack gap={2} vAlign="center">
        <Token label={result.error? 'Erro' : `Resultado: ${Array.isArray(result.value)? (result.value as unknown[]).length+' itens': result.value===null?'null':'1 valor'}`} size="sm" color={result.error?'red':'green'} />
      </HStack>
      {result.pretty!==undefined && !result.error && (
        <CodeBlock code={result.pretty ?? ''} language="json" width="100%" maxHeight={320} hasLineNumbers hasCopyButton={false} />
      )}
      <Banner status="info" title="Sintaxe suportada" description="$, ., [], [*], [0], ['key'], [0:2], * . Filtros ?() não implementados — use Regex Lab ou jq local para casos avançados." />
    </VStack>
  );
}
