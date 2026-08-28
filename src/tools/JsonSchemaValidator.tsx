import {useMemo, useState} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {TextArea} from '@astryxdesign/core/TextArea';
import {Text} from '@astryxdesign/core/Text';
import {Banner} from '@astryxdesign/core/Banner';
import {Token} from '@astryxdesign/core/Token';
import {CodeBlock} from '@astryxdesign/core/CodeBlock';
import {validateJsonSchema} from '../lib/jsonSchema';

export default function JsonSchemaValidator(){
  const [schema,setSchema]=useState('{\n  "type":"object",\n  "required":["name","email"],\n  "properties":{\n    "name":{"type":"string","minLength":1},\n    "email":{"type":"string","pattern":"^[^@]+@[^@]+$"}\n  },\n  "additionalProperties": false\n}');
  const [data,setData]=useState('{\n  "name":"Ana",\n  "email":"ana@example.com"\n}');
  const result=useMemo(()=> validateJsonSchema(schema,data),[schema,data]);
  const hasSchemaErr = 'schemaError' in result && result.schemaError;
  const hasDataErr = 'dataError' in result && result.dataError;
  return (
    <VStack gap={4}>
      <Text type="supporting" display="block">Validate payloads against a JSON Schema without sending proprietary schemas or production data to online validators.</Text>
      <HStack gap={4} wrap="wrap">
        <TextArea label="JSON Schema" placeholder='{"type":"object"}' value={schema} onChange={setSchema} rows={10} hasSpellCheck={false} status={hasSchemaErr?{type:'error', message: (result as {schemaError:string}).schemaError}:undefined} />
      </HStack>
      <TextArea label="JSON Data" placeholder='{"key":"value"}' value={data} onChange={setData} rows={8} hasSpellCheck={false} status={hasDataErr?{type:'error', message:(result as {dataError:string}).dataError}:undefined} />
      <HStack gap={2} vAlign="center">
        <Token label={result.valid ? 'Valid ✓' : `Invalid — ${result.errors.length} error(s)`} size="sm" color={result.valid?'green':'red'} />
        <Text type="supporting" display="block">{result.valid?'Schema and data are compatible': result.errors[0] ?? ''}</Text>
      </HStack>
      {!result.valid && result.errors.length>0 && (
        <CodeBlock code={result.errors.join('\n')} language="plaintext" width="100%" maxHeight={220} isWrapped hasCopyButton={false}/>
      )}
      <Banner status="info" title="Honest limit" description="Validator covers type, required, properties, enum, minimum/maximum, minLength/maxLength, pattern, additionalProperties. $ref and advanced allOf/anyOf are not supported." />
    </VStack>
  );
}
