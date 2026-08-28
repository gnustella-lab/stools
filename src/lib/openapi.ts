// Minimal OpenAPI preview — extract info, paths, schemas from JSON/YAML (using DOM? we reuse yamlConvert parse)

import { yamlToJson } from './yamlConvert';

export interface OpenApiSummary {
  title: string;
  version: string;
  openapi: string;
  paths: Array<{path:string, methods:string[], summary?:string}>;
  schemas: string[];
  error?: string;
}

export function parseOpenApi(content: string): OpenApiSummary {
  let obj: unknown;
  content=content.trim();
  if(!content) return {title:'', version:'', openapi:'', paths:[], schemas:[], error:'Vazio'};
  // try JSON
  try{
    obj = JSON.parse(content);
  } catch{
    const res = yamlToJson(content);
    if(res.error) return {title:'', version:'', openapi:'', paths:[], schemas:[], error: res.error};
    try{ obj = JSON.parse(res.output)} catch(e){ return {title:'', version:'', openapi:'', paths:[], schemas:[], error: e instanceof Error?e.message:String(e)}}
  }
  const o = obj as Record<string, unknown>;
  const info = (o.info as Record<string,unknown>) ?? {};
  const title = String(info.title ?? '');
  const version = String(info.version ?? '');
  const openapi = String(o.openapi ?? o.swagger ?? '');
  const pathsObj = (o.paths as Record<string,unknown>) ?? {};
  const paths: Array<{path:string, methods:string[], summary?:string}> = [];
  for(const [p, v] of Object.entries(pathsObj)){
    const methods = v && typeof v==='object' ? Object.keys(v as Record<string,unknown>).map(m=>m.toUpperCase()) : [];
    // try summary from first method
    let summary: string|undefined;
    if(v && typeof v==='object'){
      const first = Object.values(v as Record<string,unknown>)[0] as Record<string,unknown>|undefined;
      if(first && typeof first.summary==='string') summary = first.summary as string;
    }
    paths.push({path:p, methods, summary});
  }
  const comps = (o.components as Record<string,unknown>) ?? {};
  const schemasObj = (comps.schemas as Record<string,unknown>) ?? (o.definitions as Record<string,unknown>) ?? {};
  const schemas = Object.keys(schemasObj);
  return {title, version, openapi, paths, schemas};
}
