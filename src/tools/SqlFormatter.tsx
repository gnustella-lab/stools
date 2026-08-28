import {useMemo, useState} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {TextArea} from '@astryxdesign/core/TextArea';
import {SegmentedControl, SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';
import {Text} from '@astryxdesign/core/Text';
import {CodeBlock} from '@astryxdesign/core/CodeBlock';
import {Banner} from '@astryxdesign/core/Banner';
import {CopyButton} from '../components/CopyButton';
import {formatSql, minifySql} from '../lib/sqlFormat';

export default function SqlFormatter(){
  const [mode,setMode]=useState<'format'|'minify'>('format');
  const [input,setInput]=useState('SELECT u.id, u.name, o.total FROM users u JOIN orders o ON o.user_id=u.id WHERE o.total > 100 AND u.active=1 ORDER BY o.total DESC LIMIT 10');
  const output=useMemo(()=>{
    if(!input.trim()) return '';
    return mode==='format'? formatSql(input): minifySql(input);
  },[input,mode]);
  return (
    <VStack gap={4}>
      <Text type="supporting" display="block">Formate SQL localmente — dumps com PII não precisam ir para sqlformat.org. Keywords em maiúsculas, quebras por cláusula.</Text>
      <HStack gap={3} wrap="wrap" vAlign="end">
        <SegmentedControl label="Modo" value={mode} onChange={v=>setMode(v as 'format'|'minify')}>
          <SegmentedControlItem value="format" label="Format" />
          <SegmentedControlItem value="minify" label="Minify" />
        </SegmentedControl>
        <CopyButton value={output} />
      </HStack>
      <TextArea label="SQL" placeholder="SELECT * FROM users WHERE..." value={input} onChange={setInput} rows={6} hasSpellCheck={false} />
      {output && (
        <VStack gap={2}>
          <Text weight="semibold" display="block">Output</Text>
          <CodeBlock code={output} language="sql" width="100%" maxHeight={380} hasLineNumbers hasCopyButton={false} />
        </VStack>
      )}
      <Banner status="info" title="Limite honesto" description="Formatação heurística — cobre SELECT/JOIN/WHERE/GROUP BY/ORDER BY/LIMIT. Subqueries complexas podem precisar revisão manual." />
    </VStack>
  );
}
