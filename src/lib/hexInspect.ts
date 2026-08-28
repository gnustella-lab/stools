// Hex inspector utils

export function textToHex(text: string): string {
  const bytes = new TextEncoder().encode(text);
  return [...bytes].map(b=>b.toString(16).padStart(2,'0')).join(' ');
}
export function hexToText(hex: string): string {
  const clean = hex.replace(/[^0-9a-fA-F]/g,'');
  if (clean.length%2!==0) throw new Error('Hex length must be even');
  const bytes = new Uint8Array(clean.length/2);
  for(let i=0;i<bytes.length;i++) bytes[i]=parseInt(clean.slice(i*2,i*2+2),16);
  return new TextDecoder().decode(bytes);
}
export function textToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let s=''; for(const b of bytes) s+=String.fromCharCode(b);
  return btoa(s);
}
export function base64ToHex(b64:string): string {
  const bin = atob(b64.trim());
  const bytes = new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
  return [...bytes].map(b=>b.toString(16).padStart(2,'0')).join(' ');
}

export function hexDump(text:string, bytesPerLine=16): string {
  const bytes = new TextEncoder().encode(text);
  const lines:string[]=[];
  for(let off=0; off<bytes.length; off+=bytesPerLine){
    const chunk = bytes.slice(off, off+bytesPerLine);
    const hex = [...chunk].map(b=>b.toString(16).padStart(2,'0')).join(' ');
    const pad = '   '.repeat(bytesPerLine - chunk.length);
    const ascii = [...chunk].map(b=> b>=32&&b<=126? String.fromCharCode(b) : '.').join('');
    lines.push(`${off.toString(16).padStart(8,'0')}  ${hex}${pad}  |${ascii}|`);
  }
  if(lines.length===0) return '(empty)';
  return lines.join('\n');
}

export function hexDumpFromBytes(bytes: Uint8Array, bytesPerLine=16): string {
  const lines:string[]=[];
  for(let off=0; off<bytes.length; off+=bytesPerLine){
    const chunk = bytes.slice(off, off+bytesPerLine);
    const hex = [...chunk].map(b=>b.toString(16).padStart(2,'0')).join(' ');
    const pad = '   '.repeat(bytesPerLine - chunk.length);
    const ascii = [...chunk].map(b=> b>=32&&b<=126? String.fromCharCode(b) : '.').join('');
    lines.push(`${off.toString(16).padStart(8,'0')}  ${hex}${pad}  |${ascii}|`);
  }
  if(lines.length===0) return '(empty)';
  return lines.join('\n');
}

export function bytesToHexBytes(bytes: Uint8Array): string { return [...bytes].map(b=>b.toString(16).padStart(2,'0')).join(' ') }
export function hexToBytes(hex:string): Uint8Array {
  const clean = hex.replace(/[^0-9a-fA-F]/g,'');
  if(clean.length%2!==0) throw new Error('Hex length must be even');
  const out=new Uint8Array(clean.length/2);
  for(let i=0;i<out.length;i++) out[i]=parseInt(clean.slice(i*2,i*2+2),16);
  return out;
}
