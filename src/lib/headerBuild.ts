// Header builder & status atlas

export const STATUS_CODES: Record<number,{phrase:string, description:string}> = {
  200:{phrase:'OK', description:'Successful request'},
  201:{phrase:'Created', description:'Resource created'},
  204:{phrase:'No Content', description:'No content'},
  301:{phrase:'Moved Permanently', description:'Permanent redirect'},
  302:{phrase:'Found', description:'Temporary redirect'},
  304:{phrase:'Not Modified', description:'Cache still valid'},
  400:{phrase:'Bad Request', description:'Malformed request'},
  401:{phrase:'Unauthorized', description:'Authentication required'},
  403:{phrase:'Forbidden', description:'Forbidden'},
  404:{phrase:'Not Found', description:'Not found'},
  409:{phrase:'Conflict', description:'Conflict'},
  422:{phrase:'Unprocessable Entity', description:'Unprocessable entity'},
  429:{phrase:'Too Many Requests', description:'Rate limit'},
  500:{phrase:'Internal Server Error', description:'Internal error'},
  502:{phrase:'Bad Gateway', description:'Invalid gateway'},
  503:{phrase:'Service Unavailable', description:'Service unavailable'},
};

export function buildHeaders(entries:Array<{name:string,value:string}>): string {
  return entries.filter(e=>e.name.trim()).map(e=>`${e.name.trim()}: ${e.value}`).join('\n');
}

export function parseHeaders(raw:string): Array<{name:string,value:string}> {
  const lines=raw.split(/\r?\n/);
  const out:Array<{name:string,value:string}>=[];
  for(const line of lines){
    const idx=line.indexOf(':');
    if(idx===-1) continue;
    const name=line.slice(0,idx).trim();
    const value=line.slice(idx+1).trim();
    if(name) out.push({name,value});
  }
  return out;
}

export function headersToCurl(headers:Array<{name:string,value:string}>, url:string): string {
  const hs=headers.map(h=>`-H "${h.name}: ${h.value.replace(/"/g,'\\"')}"`).join(' ');
  return `curl ${hs} "${url}"`;
}

export function authHeader(kind:'Basic'|'Bearer'|'ApiKey', creds:{username?:string,password?:string, token?:string, headerName?:string}): string {
  if(kind==='Basic'){
    const raw=`${creds.username ?? ''}:${creds.password ?? ''}`;
    return `Basic ${btoa(raw)}`;
  }
  if(kind==='Bearer') return `Bearer ${creds.token ?? ''}`;
  if(kind==='ApiKey') return creds.token ?? '';
  return '';
}
