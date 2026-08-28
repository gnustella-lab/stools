import {useMemo, useState} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {TextArea} from '@astryxdesign/core/TextArea';
import {Text} from '@astryxdesign/core/Text';
import {CodeBlock} from '@astryxdesign/core/CodeBlock';
import {Banner} from '@astryxdesign/core/Banner';
import {CopyButton} from '../components/CopyButton';
import {formatGraphql, validateGraphql} from '../lib/graphqlFormat';

export default function GraphqlFormatter(){
  const [input,setInput]=useState('query GetUser($id: ID!) { user(id: $id) { id name email posts { title } } }');
  const formatted=useMemo(()=> formatGraphql(input),[input]);
  const err=useMemo(()=> validateGraphql(input),[input]);
  return (
    <VStack gap={4}>
      <Text type="supporting" display="block">Format and validate GraphQL queries locally — queries reveal internal schema, keep them offline.</Text>
      <TextArea label="GraphQL Query / Mutation" placeholder="query { user { id name } }" value={input} onChange={setInput} rows={8} hasSpellCheck={false} status={err && input.trim()?{type:'error', message:err}:undefined} />
      <HStack gap={2}><CopyButton value={formatted.output} /></HStack>
      {formatted.output && (
        <VStack gap={2}>
          <Text weight="semibold" display="block">Formatted</Text>
          <CodeBlock code={formatted.output} language="graphql" width="100%" maxHeight={380} hasLineNumbers hasCopyButton={false}/>
          {formatted.error && <Text type="supporting" display="block">{formatted.error}</Text>}
        </VStack>
      )}
      <Banner status="info" title="Limit" description="Heuristic formatter indenting by {}()/[]. Brace balance is validated; full syntax would require a heavy graphql parser." />
    </VStack>
  );
}
