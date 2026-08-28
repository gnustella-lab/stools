// .env ↔ JSON ↔ YAML transcode

export interface EnvJsonEntry { key:string; value:string }

export function envToObject(envText:string): Record<string,string> {
  const out: Record<string,string>={};
  const lines=envText.split(/\r?\n/);
  for(const raw of lines){
    let line=raw.trim();
    if(!line||line.startsWith('#')||line.startsWith('//')) continue;
    line=line.replace(/^export\s+/,'');
    const eq=line.indexOf('=');
    if(eq===-1) continue;
    const k=line.slice(0,eq).trim();
    let v=line.slice(eq+1).trim();
    if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'"))) v=v.slice(1,-1);
    out[k]=v;
  }
  return out;
}

export function envToJson(envText:string): {output:string, error:string|null} {
  try{
    const obj=envToObject(envText);
    return {output: JSON.stringify(obj, null, 2), error:null};
  }catch(e){return {output:'', error:e instanceof Error?e.message:String(e)}}
}

export function jsonToEnv(jsonText:string, withExport=false): {output:string, error:string|null} {
  try{
    const obj=JSON.parse(jsonText);
    if(typeof obj!=='object'||obj===null||Array.isArray(obj)) throw new Error('JSON root must be object');
    const lines:string[]=[];
    for(const [k,v] of Object.entries(obj as Record<string,unknown>)){
      const val = String(v??'');
      const needsQuote = /[\s#"'`]/.test(val);
      const esc = needsQuote ? `"${val.replace(/"/g,'\\"')}"` : val;
      lines.push(`${withExport?'export ':''}${k}=${esc}`);
    }
    return {output: lines.join('\n'), error:null};
  }catch(e){return {output:'', error:e instanceof Error?e.message:String(e)}}
}

export function envToYaml(envText:string): {output:string, error:string|null} {
  try{
    const obj=envToObject(envText);
    const lines=Object.entries(obj).map(([k,v])=>{
      const needsQuote = /[:\n#]/.test(v);
      const val = needsQuote ? JSON.stringify(v) : v;
      return `${k}: ${val}`;
    });
    return {output: lines.join('\n'), error:null};
  }catch(e){return {output:'', error:e instanceof Error?e.message:String(e)}}
}

export function yamlToEnv(yaml:string): {output:string, error:string|null} {
  // very simple: key: value per line
  try{
    const lines=yaml.split(/\r?\n/);
    const out: string[]=[];
    for(const raw of lines){
      const line=raw.trim();
      if(!line||line.startsWith('#')) continue;
      const colon=line.indexOf(':');
      if(colon===-1) continue;
      const k=line.slice(0,colon).trim();
      let v=line.slice(colon+1).trim();
      if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'"))) v=v.slice(1,-1);
      out.push(`${k}=${v.includes(' ')?`"${v}"`:v}`);
    }
    return {output: out.join('\n'), error:null};
  }catch(e){return {output:'', error:e instanceof Error?e.message:String(e)}}
}
