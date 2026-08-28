// Minimal TOML ↔ JSON — covers strings, numbers, booleans, arrays, tables
export interface ConvertResult { output:string; error:string|null }

function parseToml(toml: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  let currentSection: string[] = [];
  const lines = toml.split(/\r?\n/);
  function getTarget(): Record<string, unknown> {
    let cur: Record<string, unknown> = out;
    for (const seg of currentSection) {
      if (!cur[seg] || typeof cur[seg] !== 'object') cur[seg] = {};
      cur = cur[seg] as Record<string, unknown>;
    }
    return cur;
  }
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    if (line.startsWith('[') && line.endsWith(']')) {
      const sec = line.slice(1,-1).trim();
      // handle array table [[x]] as simple section
      const clean = sec.replace(/^\[|\]$/g,'').trim();
      currentSection = clean.split('.').map(s=>s.trim()).filter(Boolean);
      // ensure path exists
      let cur: Record<string, unknown> = out;
      for (const seg of currentSection) {
        if (!cur[seg]) cur[seg]={};
        cur = cur[seg] as Record<string, unknown>;
      }
      continue;
    }
    const eq = line.indexOf('=');
    if (eq===-1) continue;
    const key = line.slice(0,eq).trim();
    let valStr = line.slice(eq+1).trim();
    // strip inline comment outside quotes
    valStr = stripComment(valStr);
    let val: unknown;
    if (valStr.startsWith('"') && valStr.endsWith('"')) val = valStr.slice(1,-1).replace(/\\"/g,'"');
    else if (valStr.startsWith("'") && valStr.endsWith("'")) val = valStr.slice(1,-1);
    else if (valStr === 'true') val = true;
    else if (valStr === 'false') val = false;
    else if (/^-?\d+$/.test(valStr)) val = parseInt(valStr,10);
    else if (/^-?\d*\.\d+$/.test(valStr)) val = parseFloat(valStr);
    else if (valStr.startsWith('[') && valStr.endsWith(']')) {
      const inner = valStr.slice(1,-1).trim();
      if (!inner) val=[];
      else {
        val = splitArray(inner).map(v=> {
          const t=v.trim();
          if (t.startsWith('"')&&t.endsWith('"')) return t.slice(1,-1);
          if (t.startsWith("'")&&t.endsWith("'")) return t.slice(1,-1);
          if (t==='true') return true;
          if (t==='false') return false;
          if (/^-?\d+$/.test(t)) return parseInt(t,10);
          if (/^-?\d*\.\d+$/.test(t)) return parseFloat(t);
          return t;
        });
      }
    } else val = valStr;
    const target = getTarget();
    target[key]=val;
  }
  return out;
}

function stripComment(s:string): string {
  let inStr=false; let quote='';
  for(let i=0;i<s.length;i++){
    const c=s[i];
    if(!inStr && (c=='"'||c=="'")){inStr=true;quote=c;continue;}
    if(inStr && c===quote && s[i-1]!=='\\'){inStr=false;continue;}
    if(!inStr && c==='#') return s.slice(0,i).trim();
  }
  return s;
}
function splitArray(inner:string): string[]{
  const res:string[]=[]; let cur=''; let inStr=false; let quote='';
  for(let i=0;i<inner.length;i++){
    const c=inner[i];
    if(!inStr && (c=='"'||c=="'")){inStr=true;quote=c;cur+=c;continue;}
    if(inStr && c===quote){inStr=false;cur+=c;continue;}
    if(!inStr && c===','){res.push(cur);cur='';continue;}
    cur+=c;
  }
  if(cur) res.push(cur);
  return res;
}

export function tomlToJson(toml: string): ConvertResult {
  if (!toml.trim()) return {output:'', error:null};
  try {
    const obj = parseToml(toml);
    return {output: JSON.stringify(obj, null, 2), error:null};
  } catch(e){return {output:'', error: e instanceof Error?e.message:String(e)}}
}

function jsonToTomlValue(v: unknown): string {
  if (typeof v === 'string') return JSON.stringify(v);
  if (typeof v === 'boolean') return v?'true':'false';
  if (typeof v === 'number') return String(v);
  if (v===null) return '""';
  if (Array.isArray(v)) return `[${v.map(jsonToTomlValue).join(', ')}]`;
  return String(v);
}

export function jsonToToml(jsonText: string): ConvertResult {
  if (!jsonText.trim()) return {output:'', error:null};
  try {
    const obj = JSON.parse(jsonText);
    if (typeof obj !== 'object' || obj===null || Array.isArray(obj)) throw new Error('Root must be an object for TOML');
    const lines:string[]=[];
    const sections:string[]=[];
    for(const [k,v] of Object.entries(obj as Record<string,unknown>)){
      if (v && typeof v==='object' && !Array.isArray(v)){
        sections.push(k);
      } else {
        lines.push(`${k} = ${jsonToTomlValue(v)}`);
      }
    }
    for(const sec of sections){
      lines.push(`\n[${sec}]`);
      const sub = (obj as Record<string,unknown>)[sec] as Record<string,unknown>;
      for(const [k,v] of Object.entries(sub)){
        if (v && typeof v==='object' && !Array.isArray(v)){
          lines.push(`\n[${sec}.${k}]`);
          const sub2 = v as Record<string,unknown>;
          for(const [kk,vv] of Object.entries(sub2)) lines.push(`${kk} = ${jsonToTomlValue(vv)}`);
        } else {
          lines.push(`${k} = ${jsonToTomlValue(v)}`);
        }
      }
    }
    return {output: lines.join('\n'), error:null};
  } catch(e){return {output:'', error: e instanceof Error?e.message:String(e)}}
}
