// Header builder & status atlas

export const STATUS_CODES: Record<number,{phrase:string, description:string}> = {
  200:{phrase:'OK', description:'Requisição bem-sucedida'},
  201:{phrase:'Created', description:'Recurso criado'},
  204:{phrase:'No Content', description:'Sem conteúdo'},
  301:{phrase:'Moved Permanently', description:'Redirecionamento permanente'},
  302:{phrase:'Found', description:'Redirecionamento temporário'},
  304:{phrase:'Not Modified', description:'Cache válido'},
  400:{phrase:'Bad Request', description:'Requisição malformada'},
  401:{phrase:'Unauthorized', description:'Autenticação requerida'},
  403:{phrase:'Forbidden', description:'Proibido'},
  404:{phrase:'Not Found', description:'Não encontrado'},
  409:{phrase:'Conflict', description:'Conflito'},
  422:{phrase:'Unprocessable Entity', description:'Entidade não processável'},
  429:{phrase:'Too Many Requests', description:'Rate limit'},
  500:{phrase:'Internal Server Error', description:'Erro interno'},
  502:{phrase:'Bad Gateway', description:'Gateway inválido'},
  503:{phrase:'Service Unavailable', description:'Serviço indisponível'},
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
