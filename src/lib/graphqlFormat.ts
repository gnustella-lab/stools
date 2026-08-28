// Minimal GraphQL formatter — indent by braces/brackets
export function formatGraphql(q: string): {output:string, error:string|null} {
  if(!q.trim()) return {output:'', error:null};
  try{
    // naive pretty print: tokenise
    let s=q.replace(/\s+/g,' ').trim();
    // Not perfect, but indent braces
    let indent=0;
    let out='';
    let i=0;
    while(i<s.length){
      const c=s[i];
      if(c==='{'||c==='('||c==='['){
        out+=c+'\n'+'  '.repeat(++indent);
        i++; continue;
      }
      if(c==='}'||c===')'||c===']'){
        indent=Math.max(0,indent-1);
        out+='\n'+'  '.repeat(indent)+c;
        i++; continue;
      }
      if(c===','){ out+=',\n'+'  '.repeat(indent); i++; continue;}
      // keywords line break
      out+=c; i++;
    }
    // post-process: ensure keywords on new lines
    out = out.replace(/\b(query|mutation|subscription|fragment)\b/g, '\n$1').replace(/\n\s*\n/g,'\n').trim();
    // validate braces balanced
    const open = (out.match(/{/g)||[]).length;
    const close = (out.match(/}/g)||[]).length;
    if(open!==close) return {output:out, error:`Braces mismatch { ${open} vs } ${close} — output still shown`};
    return {output:out, error:null};
  }catch(e){ return {output:'', error:e instanceof Error?e.message:String(e)}}
}

export function validateGraphql(q:string): string|null {
  if(!q.trim()) return 'Empty';
  // simple: must contain query/mutation/fragment or { 
  if(!/\{/.test(q)) return 'Nenhum bloco { encontrado';
  const m=q.match(/{/g)?.length ?? 0;
  const n=q.match(/}/g)?.length ?? 0;
  if(m!==n) return `Chaves desbalanceadas: ${m} vs ${n}`;
  return null;
}
