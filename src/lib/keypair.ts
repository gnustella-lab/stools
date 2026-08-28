// Key pair generator helpers via Web Crypto

export type KeyType = 'RSA-2048'|'RSA-4096'|'EC-P256'|'EC-P384';

async function exportPem(buffer: ArrayBuffer, label:string): Promise<string> {
  const b = new Uint8Array(buffer);
  let s=''; for(const by of b) s+=String.fromCharCode(by);
  const b64 = btoa(s);
  const chunked = b64.replace(/(.{64})/g,'$1\n');
  return `-----BEGIN ${label}-----\n${chunked}\n-----END ${label}-----`;
}

export async function generateKeypair(type: KeyType): Promise<{publicPem:string, privatePem:string, publicJwk?:JsonWebKey, info:string}> {
  if(type.startsWith('RSA')){
    const modulusLength = type==='RSA-4096'?4096:2048;
    const pair = await crypto.subtle.generateKey({name:'RSA-OAEP', modulusLength, publicExponent:new Uint8Array([1,0,1]), hash:'SHA-256'}, true, ['encrypt','decrypt']);
    // For PEM we want SPKI/PKCS8; generate separately with RSASSA?
    // fallback: use RSA-OAEP for export (still valid key)
    const pub = await crypto.subtle.exportKey('spki', pair.publicKey);
    const priv = await crypto.subtle.exportKey('pkcs8', pair.privateKey);
    return {
      publicPem: await exportPem(pub,'PUBLIC KEY'),
      privatePem: await exportPem(priv,'PRIVATE KEY'),
      info: `RSA ${modulusLength} OAEP SHA-256`
    };
  } else {
    const namedCurve = type==='EC-P256'?'P-256':'P-384';
    const pair = await crypto.subtle.generateKey({name:'ECDSA', namedCurve}, true, ['sign','verify']);
    const pub = await crypto.subtle.exportKey('spki', pair.publicKey);
    const priv = await crypto.subtle.exportKey('pkcs8', pair.privateKey);
    return {
      publicPem: await exportPem(pub,'PUBLIC KEY'),
      privatePem: await exportPem(priv,'PRIVATE KEY'),
      info: `ECDSA ${namedCurve}`
    };
  }
}

export async function fingerprintPem(pem:string): Promise<string> {
  const b64 = pem.replace(/-----[^-]+-----/g,'').replace(/\s+/g,'');
  const bin = Uint8Array.from(atob(b64), c=>c.charCodeAt(0));
  const hash = await crypto.subtle.digest('SHA-256', bin.buffer as ArrayBuffer);
  return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join(':');
}
