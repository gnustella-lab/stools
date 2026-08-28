// XML ↔ JSON using DOMParser (browser)
export interface ConvertResult {output:string; error:string|null}

function domToObject(node: Element): unknown {
  const obj: Record<string, unknown> = {};
  // attributes -> @attr
  for (let i=0;i<node.attributes.length;i++){
    const a=node.attributes[i];
    obj[`@${a.name}`]=a.value;
  }
  const children = Array.from(node.children);
  if (children.length===0) {
    const text = node.textContent?.trim() ?? '';
    if (Object.keys(obj).length===0) return text;
    if (text) obj['#text']=text;
    return obj;
  }
  for (const ch of children){
    const val = domToObject(ch);
    const tag = ch.tagName;
    if (obj[tag] !== undefined) {
      if (!Array.isArray(obj[tag])) obj[tag]=[obj[tag]];
      (obj[tag] as unknown[]).push(val);
    } else obj[tag]=val;
  }
  return obj;
}

export function xmlToJson(xml: string): ConvertResult {
  if (!xml.trim()) return {output:'', error:null};
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'application/xml');
    const err = doc.querySelector('parsererror');
    if (err) throw new Error(err.textContent ?? 'Invalid XML');
    const root = doc.documentElement;
    const obj: Record<string, unknown> = {};
    obj[root.tagName]=domToObject(root);
    return {output: JSON.stringify(obj, null, 2), error:null};
  } catch(e){return {output:'', error:e instanceof Error?e.message:String(e)}}
}

function valueToXml(key:string, value: unknown, indent:string): string {
  if (value===null || value===undefined) return `${indent}<${key}/>`;
  if (typeof value === 'string' || typeof value==='number' || typeof value==='boolean'){
    const esc = String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    return `${indent}<${key}>${esc}</${key}>`;
  }
  if (Array.isArray(value)){
    return value.map(v=>valueToXml(key,v,indent)).join('\n');
  }
  if (typeof value==='object'){
    const obj = value as Record<string,unknown>;
    const attrs:string[]=[];
    const children:string[]=[];
    let text:string|undefined;
    for(const [k,v] of Object.entries(obj)){
      if(k.startsWith('@')) attrs.push(`${k.slice(1)}="${String(v).replace(/"/g,'&quot;')}"`);
      else if(k==='#text') text=String(v);
      else children.push(valueToXml(k,v,indent+'  '));
    }
    const attrStr = attrs.length? ' '+attrs.join(' '):'';
    if (children.length===0 && text===undefined) return `${indent}<${key}${attrStr}/>`;
    if (children.length===0) return `${indent}<${key}${attrStr}>${text ?? ''}</${key}>`;
    const inner = children.join('\n');
    return `${indent}<${key}${attrStr}>\n${inner}\n${indent}</${key}>`;
  }
  return `${indent}<${key}>${String(value)}</${key}>`;
}

export function jsonToXml(jsonText:string): ConvertResult {
  if(!jsonText.trim()) return {output:'', error:null};
  try{
    const obj = JSON.parse(jsonText);
    if (typeof obj !== 'object' || obj===null) throw new Error('Root must be an object');
    const keys=Object.keys(obj as Record<string,unknown>);
    if(keys.length!==1) throw new Error('JSON root must have single key as root element');
    const rootKey=keys[0];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n${valueToXml(rootKey, (obj as Record<string,unknown>)[rootKey], '')}`;
    return {output: xml, error:null};
  }catch(e){return {output:'', error:e instanceof Error?e.message:String(e)}}
}
