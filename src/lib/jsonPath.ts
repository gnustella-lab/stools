// Minimal JSONPath evaluator: supports $, ., [], [*], [0], ['key'], .key, .. collections not fully
export interface JsonPathResult { value: unknown; error: string|null }

export function evaluateJsonPath(jsonText: string, path: string): JsonPathResult & {pretty?:string} {
  let data: unknown;
  try { data = JSON.parse(jsonText); } catch(e){ return {value:null, error: e instanceof Error?e.message:String(e)}}
  try {
    const val = evalPath(data, path.trim());
    return {value: val, error:null, pretty: JSON.stringify(val, null, 2)};
  } catch(e){ return {value:null, error:e instanceof Error?e.message:String(e)} }
}

function evalPath(data: unknown, path: string): unknown {
  if (!path || path === '$') return data;
  if (!path.startsWith('$')) throw new Error('Path must start with $');
  let cur: unknown = data;
  // tokenization: split by . and []
  const tokens: string[] = [];
  let i=1; // after $
  let buf='';
  while(i<path.length){
    const c=path[i];
    if(c==='.'){
      if(buf) {tokens.push(buf); buf='';}
      i++;
      // handle ..?
      if(path[i]==='.') { tokens.push('..'); i++; }
      continue;
    }
    if(c==='['){
      if(buf){tokens.push(buf); buf='';}
      let depth=1; let j=i+1; let inside='';
      while(j<path.length && depth>0){
        if(path[j]==='[') depth++;
        else if(path[j]===']') depth--;
        if(depth>0) inside+=path[j];
        j++;
      }
      if(depth!==0) throw new Error('Unclosed [');
      tokens.push(`[${inside}]`);
      i=j;
      continue;
    }
    buf+=c; i++;
  }
  if(buf) tokens.push(buf);
  // process
  let current: unknown[] = [cur];
  for(const tok of tokens){
    if(tok==='..') throw new Error('Recursive descent .. not supported in minimal mode');
    if(tok.startsWith('[')){
      const inner = tok.slice(1,-1).trim();
      if(inner==='*' ){
        // flatten
        const next: unknown[]=[];
        for(const c of current){
          if(Array.isArray(c)) next.push(...c);
          else if(c && typeof c==='object') next.push(...Object.values(c as Record<string,unknown>));
        }
        current=next;
      } else if(inner.startsWith("'")||inner.startsWith('"')){
        const key=inner.slice(1,-1);
        const next: unknown[]=[];
        for(const c of current){
          if(c && typeof c==='object' && !Array.isArray(c) && key in (c as Record<string,unknown>)) next.push((c as Record<string,unknown>)[key]);
        }
        current=next;
      } else if(/^-?\d+$/.test(inner)){
        const idx=parseInt(inner,10);
        const next: unknown[]=[];
        for(const c of current){
          if(Array.isArray(c)){
            const v = c[idx<0? c.length+idx : idx];
            if(v!==undefined) next.push(v);
          }
        }
        current=next;
      } else if(inner.includes(':')){
        // slice [0:2]
        const [s,e]=inner.split(':').map(x=>x.trim());
        const start=s?parseInt(s,10):0;
        const end=e?parseInt(e,10):undefined;
        const next: unknown[]=[];
        for(const c of current){
          if(Array.isArray(c)){
            const slice = c.slice(start,end);
            next.push(...slice);
          }
        }
        current=next;
      } else if(inner.startsWith('?(')){
        throw new Error('Filter ?() not supported in minimal mode — use simple paths like $[*].name')
      } else {
        throw new Error(`Unsupported bracket ${tok}`);
      }
    } else {
      // property
      if(tok==='*'){
        const next: unknown[]=[];
        for(const c of current){
          if(c && typeof c==='object' && !Array.isArray(c)) next.push(...Object.values(c as Record<string,unknown>));
          else if(Array.isArray(c)) next.push(...c);
        }
        current=next;
      } else {
        const next: unknown[]=[];
        for(const c of current){
          if(c && typeof c==='object' && !Array.isArray(c) && tok in (c as Record<string,unknown>)) next.push((c as Record<string,unknown>)[tok]);
          else if(Array.isArray(c)){
            // map over array elements property
            for(const el of c){
              if(el && typeof el==='object' && tok in (el as Record<string,unknown>)) next.push((el as Record<string,unknown>)[tok]);
            }
          }
        }
        current=next;
      }
    }
  }
  if(current.length===0) return null;
  if(current.length===1) return current[0];
  return current;
}
