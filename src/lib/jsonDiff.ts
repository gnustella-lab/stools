// JSON semantic diff — structural, order-insensitive for objects

export interface JsonDiffEntry {
  path: string;
  type: 'added'|'removed'|'changed';
  oldValue?: unknown;
  newValue?: unknown;
}

export function diffJson(aText:string, bText:string): {diffs: JsonDiffEntry[], error:string|null} {
  let a: unknown, b: unknown;
  try{ a=JSON.parse(aText)} catch(e){ return {diffs:[], error: e instanceof Error?`JSON A: ${e.message}`:String(e)}}
  try{ b=JSON.parse(bText)} catch(e){ return {diffs:[], error: e instanceof Error?`JSON B: ${e.message}`:String(e)}}
  const diffs: JsonDiffEntry[]=[];
  compare(a,b,'$', diffs);
  return {diffs, error:null};
}

function compare(a:unknown, b:unknown, path:string, out:JsonDiffEntry[]): void {
  if (JSON.stringify(a)===JSON.stringify(b)) return;
  if (a===null||b===null|| typeof a!==typeof b || typeof a!=='object'){
    out.push({path, type:'changed', oldValue:a, newValue:b});
    return;
  }
  if (Array.isArray(a) && Array.isArray(b)){
    const max=Math.max(a.length,b.length);
    for(let i=0;i<max;i++){
      if(i>=a.length) out.push({path:`${path}[${i}]`, type:'added', newValue: b[i]});
      else if(i>=b.length) out.push({path:`${path}[${i}]`, type:'removed', oldValue: a[i]});
      else compare(a[i], b[i], `${path}[${i}]`, out);
    }
    return;
  }
  if(Array.isArray(a) !== Array.isArray(b)){
    out.push({path, type:'changed', oldValue:a, newValue:b});
    return;
  }
  const ao = a as Record<string,unknown>;
  const bo = b as Record<string,unknown>;
  const keys = new Set([...Object.keys(ao), ...Object.keys(bo)]);
  for(const k of keys){
    if(!(k in ao)) out.push({path: `${path}.${k}`, type:'added', newValue: bo[k]});
    else if(!(k in bo)) out.push({path: `${path}.${k}`, type:'removed', oldValue: ao[k]});
    else compare(ao[k], bo[k], `${path}.${k}`, out);
  }
}
