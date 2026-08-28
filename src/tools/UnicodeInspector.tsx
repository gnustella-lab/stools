import {useMemo, useState} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {TextArea} from '@astryxdesign/core/TextArea';
import {Text} from '@astryxdesign/core/Text';
import {CodeBlock} from '@astryxdesign/core/CodeBlock';
import {Banner} from '@astryxdesign/core/Banner';
import {inspectText, normalizeInfo, utf8Bytes, detectMojibake} from '../lib/unicodeInspect';

export default function UnicodeInspector(){
  const [text,setText]=useState('Café — naïve café ☕\nA\u0301 (A + combining acute)');
  const infos=useMemo(()=> inspectText(text),[text]);
  const norms=useMemo(()=> normalizeInfo(text),[text]);
  const utf8=useMemo(()=> utf8Bytes(text),[text]);
  const moj=useMemo(()=> detectMojibake(text),[text]);
  return (
    <VStack gap={4}>
      <Text type="supporting" display="block">Inspecione codepoints, UTF-8 bytes e normalizações NFC/NFD sem enviar texto sensível.</Text>
      <TextArea label="Texto" value={text} onChange={setText} rows={4} hasSpellCheck={false} />
      {moj && <Banner status="warning" title="Encoding suspeito" description={moj} />}
      <VStack gap={2}>
        <Text weight="semibold" display="block">Codepoints ({infos.length}) — primeiros 200</Text>
        <CodeBlock code={infos.slice(0,200).map(i=> `${i.char==='\\n'? '↵': i.char===' '?'·': i.char}  ${i.codepoint}  dec ${i.dec}  UTF-8 ${i.utf8}`).join('\n')} language="plaintext" width="100%" maxHeight={260} isWrapped hasCopyButton={false} />
      </VStack>
      <HStack gap={4} wrap="wrap">
        <VStack gap={1}><Text weight="semibold" display="block">UTF-8 ({utf8.len} bytes)</Text><CodeBlock code={utf8.hex} language="plaintext" width="100%" maxHeight={120} isWrapped hasCopyButton={false}/></VStack>
        <VStack gap={1}><Text weight="semibold" display="block">Normalizações</Text>
          {Object.entries(norms).map(([k,v])=>(
            <Text key={k} type="code" display="block">{k}: {JSON.stringify(v).slice(0,120)}</Text>
          ))}
        </VStack>
      </HStack>
      <Banner status="info" title="Privado" description="Tudo via TextEncoder/DOM. Para spoofing avançado veja Invisible Character Detector e Homograph Detector." />
    </VStack>
  );
}
