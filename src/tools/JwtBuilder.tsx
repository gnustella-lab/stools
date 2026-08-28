import {useMemo, useState} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {TextArea} from '@astryxdesign/core/TextArea';
import {TextInput} from '@astryxdesign/core/TextInput';
import {Selector} from '@astryxdesign/core/Selector';
import {Text} from '@astryxdesign/core/Text';
import {CodeBlock} from '@astryxdesign/core/CodeBlock';
import {Banner} from '@astryxdesign/core/Banner';
import {CopyButton} from '../components/CopyButton';
import {buildJwt, verifyJwt, type JwtAlg} from '../lib/jwtBuild';

export default function JwtBuilder(){
  const [alg,setAlg]=useState<JwtAlg>('HS256');
  const [header,setHeader]=useState('{\n  "kid":"dev-1"\n}');
  const [payload,setPayload]=useState('{\n  "sub":"123",\n  "name":"Ana",\n  "iat": 1714000000\n}');
  const [secret,setSecret]=useState('super-secret-local-only');
  const [token,setToken]=useState('');
  const [verified,setVerified]=useState<string>('');
  const headerObj=useMemo(()=>{try{return JSON.parse(header)}catch{return null}},[header]);
  const payloadObj=useMemo(()=>{try{return JSON.parse(payload)}catch{return null}},[payload]);

  const canBuild = !!headerObj && !!payloadObj && !!secret;

  const handleBuild=async()=>{
    if(!canBuild) return;
    const t=await buildJwt(headerObj, payloadObj, secret, alg);
    setToken(t);
    setVerified('');
  };
  const handleVerify=async()=>{
    if(!token||!secret) return;
    try{
      const r=await verifyJwt(token, secret);
      setVerified(r.valid? `✓ válido (${r.alg}) — payload: ${JSON.stringify(r.payload)}` : `✗ inválido (${r.alg ?? 'alg desconhecido'})`);
    }catch(e){ setVerified(e instanceof Error?e.message:String(e))}
  };

  return (
    <VStack gap={4}>
      <Text type="supporting" display="block">Construa e assine JWTs HS256/384/512 localmente. Alternativa privada ao jwt.io — o secret nunca sai deste tab.</Text>
      <HStack gap={3} wrap="wrap" vAlign="end">
        <Selector label="Alg" value={alg} onChange={v=>setAlg(v as JwtAlg)} options={[{value:'HS256',label:'HS256'},{value:'HS384',label:'HS384'},{value:'HS512',label:'HS512'}]} />
        <TextInput label="Secret (HMAC)" placeholder="sua-chave-secreta" value={secret} onChange={setSecret} width="280px" />
        <CopyButton value={token} label="Copiar JWT" />
      </HStack>
      <HStack gap={4} wrap="wrap">
        <VStack gap={2} style={{flex:1, minWidth:280}}>
          <TextArea label="Header (JSON sem alg/typ)" value={header} onChange={setHeader} rows={4} hasSpellCheck={false} status={headerObj?undefined:{type:'error', message:'JSON inválido'}} />
          <TextArea label="Payload (JSON)" value={payload} onChange={setPayload} rows={6} hasSpellCheck={false} status={payloadObj?undefined:{type:'error', message:'JSON inválido'}} />
          <HStack gap={2}>
            <button onClick={handleBuild} disabled={!canBuild} style={{padding:'8px 14px', borderRadius:8, background: canBuild?'#111':'#ccc', color:'#fff', border:'none', cursor: canBuild?'pointer':'not-allowed'}}>Assinar JWT</button>
            <button onClick={handleVerify} disabled={!token} style={{padding:'8px 14px', borderRadius:8, background: token?'#222':'#ccc', color:'#fff', border:'none'}}>Verificar com secret</button>
          </HStack>
          {verified && <Text type="supporting" display="block">{verified}</Text>}
        </VStack>
        <VStack gap={2} style={{flex:1, minWidth:280}}>
          <Text weight="semibold" display="block">Token</Text>
          <CodeBlock code={token || '(clique em Assinar)'} language="plaintext" width="100%" maxHeight={260} isWrapped hasCopyButton={false} />
        </VStack>
      </HStack>
      <Banner status="warning" title="Aviso" description="Assinatura HMAC local. Não valide tokens de produção apenas com este tool — verifique expiração (exp) e audiência no seu backend." />
    </VStack>
  );
}
