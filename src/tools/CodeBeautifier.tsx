import {useMemo, useState} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {TextArea} from '@astryxdesign/core/TextArea';
import {SegmentedControl, SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';
import {Selector} from '@astryxdesign/core/Selector';
import {Text} from '@astryxdesign/core/Text';
import {CodeBlock} from '@astryxdesign/core/CodeBlock';
import {Banner} from '@astryxdesign/core/Banner';
import {CopyButton} from '../components/CopyButton';
import {beautify, minify, type BeautifyLang, type BeautifyEngine} from '../lib/beautify';

export default function CodeBeautifier(){
  const [lang,setLang]=useState<BeautifyLang>('js');
  const [engine,setEngine]=useState<BeautifyEngine>('fast');
  const [mode,setMode]=useState<'beautify'|'minify'>('beautify');
  const [input,setInput]=useState('function hello(name){return "hi "+name;}\nconst x={a:1,b:[2,3]};');
  const output=useMemo(()=>{
    if(!input.trim()) return '';
    return mode==='beautify' ? beautify(input, lang, engine) : minify(input, lang);
  },[input,lang,engine,mode]);

  return (
    <VStack gap={4}>
      <Text type="supporting" display="block">Formate/beautify HTML, CSS, JS e JSON sem colar código proprietário em prettifier.cloud. Duas engines locais.</Text>
      <HStack gap={3} wrap="wrap" vAlign="end">
        <Selector label="Linguagem" value={lang} onChange={v=>setLang(v as BeautifyLang)} options={[{value:'js',label:'JS'},{value:'html',label:'HTML'},{value:'css',label:'CSS'},{value:'json',label:'JSON'}]} />
        <SegmentedControl label="Modo" value={mode} onChange={v=>setMode(v as 'beautify'|'minify')}>
          <SegmentedControlItem value="beautify" label="Beautify" />
          <SegmentedControlItem value="minify" label="Minify" />
        </SegmentedControl>
        {mode==='beautify' && (
          <SegmentedControl label="Engine" value={engine} onChange={v=>setEngine(v as BeautifyEngine)}>
            <SegmentedControlItem value="fast" label="Fast (leve)" />
            <SegmentedControlItem value="pretty" label="Pretty (fiel)" />
          </SegmentedControl>
        )}
        <CopyButton value={output} />
      </HStack>
      <TextArea label="Input" value={input} onChange={setInput} rows={8} hasSpellCheck={false} />
      {output && (
        <VStack gap={2}>
          <Text weight="semibold" display="block">Output — {engine} / {lang} {mode}</Text>
          <CodeBlock code={output} language={lang==='js'?'javascript':lang} width="100%" maxHeight={380} hasLineNumbers hasCopyButton={false} />
          <Text type="supporting" display="block">{input.length} → {output.length} chars ({output.length<input.length? 'economia '+ (input.length-output.length): 'expandido'})</Text>
        </VStack>
      )}
      <Banner status="info" title="Engines" description="Fast: regex leve, instantâneo. Pretty: tenta preservar estrutura (ex.: JSON com JSON.stringify). Ambos offline, sem upload." />
    </VStack>
  );
}
