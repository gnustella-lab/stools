// JWT Builder local — HS256/384/512 via Web Crypto. No verification against server.
import {toArrayBuffer} from './bytes';

function base64urlEncode(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function base64urlDecode(str: string): Uint8Array {
  let s = str.replace(/-/g,'+').replace(/_/g,'/');
  const pad = s.length % 4;
  if (pad) s += '='.repeat(4 - pad);
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) out[i]=bin.charCodeAt(i);
  return out;
}

export type JwtAlg = 'HS256'|'HS384'|'HS512';

const algToHash: Record<JwtAlg, string> = {HS256:'SHA-256', HS384:'SHA-384', HS512:'SHA-512'};

export async function buildJwt(headerObj: Record<string,unknown>, payloadObj: Record<string,unknown>, secret: string, alg: JwtAlg): Promise<string> {
  const header = {...headerObj, alg, typ:'JWT'};
  const headerJson = JSON.stringify(header);
  const payloadJson = JSON.stringify(payloadObj);
  const headerB64 = base64urlEncode(new TextEncoder().encode(headerJson));
  const payloadB64 = base64urlEncode(new TextEncoder().encode(payloadJson));
  const signingInput = `${headerB64}.${payloadB64}`;
  const key = await crypto.subtle.importKey('raw', toArrayBuffer(new TextEncoder().encode(secret)), {name:'HMAC', hash: algToHash[alg]}, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, toArrayBuffer(new TextEncoder().encode(signingInput))));
  const sigB64 = base64urlEncode(sig);
  return `${signingInput}.${sigB64}`;
}

export async function verifyJwt(token:string, secret:string): Promise<{valid:boolean, header:unknown, payload:unknown, alg: JwtAlg|null}> {
  const parts = token.split('.');
  if(parts.length!==3) throw new Error('JWT must have 3 parts');
  const headerJson = new TextDecoder().decode(base64urlDecode(parts[0]));
  const header = JSON.parse(headerJson) as Record<string,unknown>;
  const alg = (header.alg as JwtAlg) ?? null;
  if(!alg || !(alg in algToHash)) return {valid:false, header, payload:null, alg: null};
  const signingInput = `${parts[0]}.${parts[1]}`;
  const key = await crypto.subtle.importKey('raw', toArrayBuffer(new TextEncoder().encode(secret)), {name:'HMAC', hash: algToHash[alg]}, false, ['verify']);
  const sig = base64urlDecode(parts[2]);
  const valid = await crypto.subtle.verify('HMAC', key, toArrayBuffer(sig), toArrayBuffer(new TextEncoder().encode(signingInput)));
  let payload: unknown = null;
  try{ payload = JSON.parse(new TextDecoder().decode(base64urlDecode(parts[1])))} catch{}
  return {valid, header, payload, alg};
}

// helpers exposed for UI
export function decodeBase64UrlJson(b64:string): unknown {
  try{
    const bytes = base64urlDecode(b64);
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch{ return null}
}
