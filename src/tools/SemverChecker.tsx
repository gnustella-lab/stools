import {useMemo, useState} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {TextInput} from '@astryxdesign/core/TextInput';
import {Text} from '@astryxdesign/core/Text';
import {Token} from '@astryxdesign/core/Token';
import {Banner} from '@astryxdesign/core/Banner';
import {parseSemver, compareSemver, diffSemver, satisfiesRange} from '../lib/semver';

export default function SemverChecker(){
  const [a,setA]=useState('1.4.2');
  const [b,setB]=useState('1.5.0');
  const [range,setRange]=useState('^1.4.0');
  const pa=useMemo(()=> parseSemver(a),[a]);
  const pb=useMemo(()=> parseSemver(b),[b]);
  const cmp=useMemo(()=> pa&&pb ? compareSemver(pa,pb): null,[pa,pb]);
  const diff=useMemo(()=> diffSemver(a,b),[a,b]);
  const sat=useMemo(()=> satisfiesRange(a, range),[a,range]);
  return (
    <VStack gap={4}>
      <Text type="supporting" display="block">Compare SemVer versions and test ranges (^, ~, &gt;=) locally — useful for checking package.json without querying an external service.</Text>
      <HStack gap={3} wrap="wrap" vAlign="end">
        <TextInput label="Version A" value={a} onChange={setA} width="160px" status={pa?undefined:{type:'error', message:'x.y.z'}} />
        <TextInput label="Version B" value={b} onChange={setB} width="160px" status={pb?undefined:{type:'error', message:'x.y.z'}} />
        <TextInput label="Range" value={range} onChange={setRange} placeholder="^1.4.0" width="160px" />
      </HStack>
      <VStack gap={2}>
        <HStack gap={2} vAlign="center">
          <Token label={cmp===null? 'invalid': cmp===0?'A == B': cmp>0?'A > B':'A < B'} size="sm" color={cmp===0?'green': cmp===null?'red':'blue'} />
          <Text type="supporting" display="block">{diff}</Text>
        </HStack>
        {pa && <Text type="code" display="block">{pa.raw} → major {pa.major} minor {pa.minor} patch {pa.patch}{pa.prerelease?` prerelease ${pa.prerelease}`:''}</Text>}
        <HStack gap={2} vAlign="center">
          <Token label={sat.satisfies? 'satisfies ✓':'does not satisfy'} size="sm" color={sat.satisfies?'green':'red'} />
          <Text type="supporting" display="block">{a} {sat.satisfies?'∈':'∉'} {range} — {sat.reason}</Text>
        </HStack>
      </VStack>
      <Banner status="info" title="Supported ranges" description="*, ^, ~, >=, >, <=, < and exact equality. No OR (||) or complex hyphen ranges." />
    </VStack>
  );
}
