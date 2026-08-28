import {useState} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Selector} from '@astryxdesign/core/Selector';
import {Text} from '@astryxdesign/core/Text';
import {CodeBlock} from '@astryxdesign/core/CodeBlock';
import {Banner} from '@astryxdesign/core/Banner';
import {CopyButton} from '../components/CopyButton';
import {generateKeypair, fingerprintPem, type KeyType} from '../lib/keypair';

export default function KeypairGenerator(){
  const [type,setType]=useState<KeyType>('RSA-2048');
  const [pub,setPub]=useState('');
  const [priv,setPriv]=useState('');
  const [info,setInfo]=useState('');
  const [fp,setFp]=useState('');
  const [busy,setBusy]=useState(false);
  const [err,setErr]=useState<string|null>(null);

  const generate=async()=>{
    setBusy(true); setErr(null);
    try{
      const r=await generateKeypair(type);
      setPub(r.publicPem); setPriv(r.privatePem); setInfo(r.info);
      setFp(await fingerprintPem(r.publicPem));
    }catch(e){ setErr(e instanceof Error?e.message:String(e))}
    finally{ setBusy(false)}
  };

  return (
    <VStack gap={4}>
      <Text type="supporting" display="block">Gere par de chaves RSA/EC offline via Web Crypto. A chave privada nunca sai deste tab — nada é enviado.</Text>
      <HStack gap={3} wrap="wrap" vAlign="end">
        <Selector label="Tipo" value={type} onChange={v=>setType(v as KeyType)} options={[{value:'RSA-2048',label:'RSA 2048'},{value:'RSA-4096',label:'RSA 4096'},{value:'EC-P256',label:'EC P-256'},{value:'EC-P384',label:'EC P-384'}]} />
        <button onClick={generate} disabled={busy} style={{padding:'8px 14px', borderRadius:8, background: busy?'#ccc':'#111', color:'#fff', border:'none', cursor: busy?'wait':'pointer'}}>{busy? 'Gerando…':'Gerar par'}</button>
        {info && <Text type="supporting" display="block">{info}</Text>}
      </HStack>
      {err && <Text color="accent" display="block">{err}</Text>}
      {pub && (
        <>
          <VStack gap={2}>
            <HStack gap={2} vAlign="center"><Text weight="semibold" display="block">Public Key (SPKI)</Text><CopyButton value={pub} /></HStack>
            <CodeBlock code={pub} language="plaintext" width="100%" maxHeight={220} isWrapped hasCopyButton={false}/>
            <Text type="supporting" display="block">SHA-256 fingerprint: {fp}</Text>
          </VStack>
          <VStack gap={2}>
            <HStack gap={2} vAlign="center"><Text weight="semibold" display="block">Private Key (PKCS#8) — mantenha em segredo</Text><CopyButton value={priv} /></HStack>
            <CodeBlock code={priv} language="plaintext" width="100%" maxHeight={260} isWrapped hasCopyButton={false}/>
          </VStack>
        </>
      )}
      <Banner status="warning" title="Cuidado" description="Chaves são para dev/teste. Não reutilize a mesma chave em produção sem HSM. Feche a aba para descartar." />
    </VStack>
  );
}
