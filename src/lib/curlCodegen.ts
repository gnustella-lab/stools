// cURL → Code generator — parses simple curl syntax locally

export interface CurlParsed {
  url: string;
  method: string;
  headers: Record<string,string>;
  data?: string;
  raw: string;
}

export function parseCurl(curl: string): CurlParsed | null {
  const raw = curl.trim();
  if (!raw) return null;
  // minimal tokenisation handling quoted strings
  const tokens = tokenize(raw);
  if (!tokens.length) return null;
  // skip leading curl ?
  let idx = 0;
  if (tokens[0]==='curl') idx=1;
  let method='GET';
  let url='';
  const headers: Record<string,string>={};
  let data: string|undefined;
  while(idx<tokens.length){
    const t=tokens[idx];
    if(t==='-X' || t==='--request'){
      method = tokens[idx+1]?.toUpperCase() ?? method;
      idx+=2; continue;
    }
    if(t==='-H' || t==='--header'){
      const hv=tokens[idx+1] ?? '';
      const colon=hv.indexOf(':');
      if(colon!==-1){
        const k=hv.slice(0,colon).trim();
        const v=hv.slice(colon+1).trim();
        headers[k]=v;
      }
      idx+=2; continue;
    }
    if(t==='-d' || t==='--data' || t==='--data-raw' || t==='--data-binary'){
      data=tokens[idx+1] ?? '';
      if(!method || method==='GET') method='POST';
      idx+=2; continue;
    }
    if(t==='-u' || t==='--user'){
      const cred=tokens[idx+1] ?? '';
      headers['Authorization']='Basic ' + btoa(cred);
      idx+=2; continue;
    }
    if(t==='-b' || t==='--cookie'){
      headers['Cookie']=tokens[idx+1] ?? '';
      idx+=2; continue;
    }
    if(t.startsWith('http://')||t.startsWith('https://')){
      url=t;
    } else if(t.startsWith("'http")||t.startsWith('"http')){
      url=t.slice(1,-1);
    }
    idx++;
  }
  // fallback: find URL via regex
  if(!url){
    const m=raw.match(/https?:\/\/[^\s'"]+/);
    if(m) url=m[0];
  }
  if(!url) return null;
  return {url, method, headers, data, raw};
}

function tokenize(s:string): string[] {
  const out:string[]=[]; let cur=''; let inQ=false; let q=''; let esc=false;
  for(let i=0;i<s.length;i++){
    const c=s[i];
    if(esc){ cur+=c; esc=false; continue;}
    if(c==='\\'){ esc=true; cur+=c; continue;}
    if(!inQ && (c==="'"||c==='"')){ inQ=true; q=c; cur+=c; continue;}
    if(inQ && c===q){ inQ=false; cur+=c; out.push(stripQuotes(cur)); cur=''; continue;}
    if(!inQ && /\s/.test(c)){ if(cur){ out.push(stripQuotes(cur)); cur=''; } continue;}
    cur+=c;
  }
  if(cur) out.push(stripQuotes(cur));
  return out;
}
function stripQuotes(s:string): string {
  if(s.length>=2 && ((s[0]==="'"&&s[s.length-1]==="'")||(s[0]==='"'&&s[s.length-1]==='"'))) return s.slice(1,-1);
  return s;
}

export function curlToFetch(parsed: CurlParsed): string {
  const headersStr = Object.entries(parsed.headers).map(([k,v])=>`    "${k}": "${v.replace(/"/g,'\\"')}"`).join(',\n');
  const hasBody = !!parsed.data;
  const bodyStr = hasBody ? `,\n  body: ${JSON.stringify(parsed.data)}` : '';
  return `fetch("${parsed.url}", {\n  method: "${parsed.method}"${headersStr?`,\n  headers: {\n${headersStr}\n  }`:''}${bodyStr}\n});`;
}
export function curlToPython(parsed: CurlParsed): string {
  const headersLines = Object.entries(parsed.headers).map(([k,v])=>`    "${k}": "${v.replace(/"/g,'\\"')}"`).join(',\n');
  return `import requests\n\nurl = "${parsed.url}"\nheaders = {\n${headersLines}\n}\n${parsed.data?`data = ${JSON.stringify(parsed.data)}\n`:''}response = requests.${parsed.method.toLowerCase()}(url, headers=headers${parsed.data?', data=data':''})\nprint(response.text)`;
}
export function curlToGo(parsed: CurlParsed): string {
  const headersLines = Object.entries(parsed.headers).map(([k,v])=>`    req.Header.Set("${k}", "${v.replace(/"/g,'\\"')}")`).join('\n');
  return `package main\nimport ( "fmt"; "net/http"; "strings"; "io")\nfunc main(){\n  url := "${parsed.url}"\n${parsed.data?`  payload := strings.NewReader(${JSON.stringify(parsed.data)})\n`:''}  req, _ := http.NewRequest("${parsed.method}", url, ${parsed.data?'payload':'nil'})\n${headersLines}\n  client := &http.Client{}\n  resp, _ := client.Do(req)\n  defer resp.Body.Close()\n  body,_ := io.ReadAll(resp.Body)\n  fmt.Println(string(body))\n}`;
}
