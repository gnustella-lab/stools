import {useMemo, useState} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {TextArea} from '@astryxdesign/core/TextArea';
import {Text} from '@astryxdesign/core/Text';
import {CodeBlock} from '@astryxdesign/core/CodeBlock';
import {Banner} from '@astryxdesign/core/Banner';
import {Token} from '@astryxdesign/core/Token';
import {parseOpenApi} from '../lib/openapi';

export default function OpenApiPreview(){
  const [input,setInput]=useState(`openapi: 3.0.3
info:
  title: Demo API
  version: 1.0.0
paths:
  /users:
    get:
      summary: List users
      responses:
        '200':
          description: ok
  /users/{id}:
    get:
      summary: Get user
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
components:
  schemas:
    User:
      type: object
      properties:
        id: {type: string}
        name: {type: string}`);
  const parsed=useMemo(()=> parseOpenApi(input),[input]);
  return (
    <VStack gap={4}>
      <Text type="supporting" display="block">Preview OpenAPI/Swagger (JSON or YAML) without uploading the confidential spec to online editors. Lists paths and schemas locally.</Text>
      <TextArea label="OpenAPI (YAML or JSON)" placeholder="openapi: 3.0.0 ..." value={input} onChange={setInput} rows={12} hasSpellCheck={false} />
      {parsed.error ? (
        <Text color="accent" display="block">Error: {parsed.error}</Text>
      ) : (
        <VStack gap={3}>
          <HStack gap={2} wrap="wrap" vAlign="center">
            <Token label={`${parsed.openapi || 'no version'}`} size="sm" />
            <Token label={parsed.title || 'no title'} size="sm" color="green" />
            <Token label={`v${parsed.version || '?'}`} size="sm" />
            <Token label={`${parsed.paths.length} paths`} size="sm" color="blue" />
            <Token label={`${parsed.schemas.length} schemas`} size="sm" />
          </HStack>
          <VStack gap={2}>
            <Text weight="semibold" display="block">Paths</Text>
            {parsed.paths.length===0? <Text type="supporting" display="block">No paths detected</Text> :
              parsed.paths.map(p=>(
                <HStack key={p.path} gap={2} wrap="wrap" vAlign="center">
                  <Text type="code" display="block">{p.path}</Text>
                  <HStack gap={1}>{p.methods.map(m=> <Token key={m} label={m} size="sm" />)}</HStack>
                  {p.summary && <Text type="supporting" display="block">— {p.summary}</Text>}
                </HStack>
              ))
            }
          </VStack>
          {parsed.schemas.length>0 && (
            <VStack gap={1}><Text weight="semibold" display="block">Schemas</Text><CodeBlock code={parsed.schemas.join('\n')} language="plaintext" width="100%" isWrapped hasCopyButton={false}/></VStack>
          )}
          <CodeBlock code={JSON.stringify({title:parsed.title, version:parsed.version, openapi:parsed.openapi, paths:parsed.paths},null,2)} language="json" width="100%" maxHeight={260} hasLineNumbers hasCopyButton={false}/>
        </VStack>
      )}
      <Banner status="info" title="Lightweight" description="Preview lists paths/methods/schemas. Full Swagger UI rendering is not included to keep the bundle light — all via internal DOMParser/js-yaml." />
    </VStack>
  );
}
