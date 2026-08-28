import {useMemo, useState} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {TextArea} from '@astryxdesign/core/TextArea';
import {SegmentedControl, SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';
import {Text} from '@astryxdesign/core/Text';
import {CodeBlock} from '@astryxdesign/core/CodeBlock';
import {Banner} from '@astryxdesign/core/Banner';
import {CopyButton} from '../components/CopyButton';
import {textToHex, hexToText, hexDump, hexDumpFromBytes} from '../lib/hexInspect';

type Mode='text2hex'|'hex2text'|'dump';
export default function HexInspector(){
  const [mode,setMode]=useState<Mode>('text2hex');
  const [text,setText]=useState('Hello, sTools — offline hex ✓');
  const [hex,setHex]=useState('4f6c612c2073546f6f6c73');
  const result=useMemo(()=>{
    try{
      if(mode==='text2hex') return {output: textToHex(text), error:null as string|null};
      if(mode==='hex2text') return {output: hexToText(hex), error:null};
      // dump mode from text
      return {output: hexDump(text), error:null};
    }catch(e){ return {output:'', error:e instanceof Error?e.message:String(e)}}
  },[mode,text,hex]);

  // file hex dump
  const [fileDump,setFileDump]=useState<string>('');
  const onFile=async (f: File|null)=>{
    if(!f){ setFileDump(''); return;}
    const buf= new Uint8Array(await f.arrayBuffer());
    setFileDump(hexDumpFromBytes(buf.slice(0, 4096)) + (buf.length>4096? `\n... +${buf.length-4096} bytes (showing 4k)`: ` — ${buf.length} bytes`));
  };

  return (
    <VStack gap={4}>
      <Text type="supporting" display="block">Inspect Hex ↔ Text ↔ Base64 without uploading binaries to online hex viewers. Local <code>xxd</code>-style dump.</Text>
      <SegmentedControl label="Mode" value={mode} onChange={v=>setMode(v as Mode)}>
        <SegmentedControlItem value="text2hex" label="Text → Hex" />
        <SegmentedControlItem value="hex2text" label="Hex → Text" />
        <SegmentedControlItem value="dump" label="Hex Dump" />
      </SegmentedControl>
      {mode==='text2hex' && <TextArea label="Text" value={text} onChange={setText} rows={4} hasSpellCheck={false} />}
      {mode==='hex2text' && <TextArea label="Hex (spaces optional)" value={hex} onChange={setHex} rows={4} hasSpellCheck={false} status={result.error?{type:'error', message:result.error}:undefined} />}
      {mode==='dump' && <TextArea label="Text to dump" value={text} onChange={setText} rows={4} hasSpellCheck={false} />}
      {result.output && (
        <VStack gap={2}>
          <HStack gap={2} vAlign="center"><Text weight="semibold" display="block">Output</Text><CopyButton value={result.output} /></HStack>
          <CodeBlock code={result.output} language="plaintext" width="100%" maxHeight={300} isWrapped hasCopyButton={false}/>
        </VStack>
      )}
      <VStack gap={2}>
        <Text weight="semibold" display="block">File → Hex Dump (first 4k, local)</Text>
        <input type="file" onChange={e=>onFile(e.target.files?.[0] ?? null)} />
        {fileDump && <CodeBlock code={fileDump} language="plaintext" width="100%" maxHeight={300} isWrapped hasCopyButton={false} />}
      </VStack>
      <Banner status="info" title="Tip" description="Hex is UTF-8. For Base64 use the Base64 Codec. Files are never uploaded." />
    </VStack>
  );
}
