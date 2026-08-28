// Query string builder / parser

export interface QueryEntry { key:string; value:string; encodedKey:string; encodedValue:string }

export function parseQuery(input: string): {entries: QueryEntry[], error:string|null} {
  try{
    let s = input.trim();
    if(!s) return {entries:[], error:null};
    // if full URL, extract search
    try{
      const u=new URL(s);
      s=u.search.slice(1);
    }catch{
      // strip leading ?
      if(s.startsWith('?')) s=s.slice(1);
      if(s.includes('?')){
        const q=s.indexOf('?');
        s=s.slice(q+1);
      }
    }
    if(!s) return {entries:[], error:null};
    const params=new URLSearchParams(s);
    const entries: QueryEntry[]=[];
    for(const [k,v] of params.entries()){
      entries.push({key:k, value:v, encodedKey:encodeURIComponent(k), encodedValue:encodeURIComponent(v)});
    }
    return {entries, error:null};
  }catch(e){return {entries:[], error:e instanceof Error?e.message:String(e)}}
}

export function buildQuery(entries: Array<{key:string,value:string}>): string {
  const p=new URLSearchParams();
  for(const {key,value} of entries){
    if(!key) continue;
    p.append(key, value);
  }
  const s=p.toString();
  return s ? `?${s}` : '';
}

export function buildUrl(base:string, entries:Array<{key:string,value:string}>): string {
  try{
    const u=new URL(base);
    const p=new URLSearchParams();
    for(const {key,value} of entries) if(key) p.append(key,value);
    u.search=p.toString();
    return u.toString();
  }catch{
    const q=buildQuery(entries);
    if(!base) return q;
    if(base.includes('?')) return base.split('?')[0]+q;
    return base+q;
  }
}
