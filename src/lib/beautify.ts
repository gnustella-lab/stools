// Simple beautifiers — two engines: fast (light regex) and pretty (more faithful)
// No external deps.

export type BeautifyLang = 'html'|'css'|'js'|'json';
export type BeautifyEngine = 'fast'|'pretty';

function fastHtml(html:string): string {
  // naive: break tags onto new lines, indent
  let s = html.replace(/>\s*</g,'>\n<').trim();
  const lines = s.split('\n');
  let indent=0;
  const out:string[]=[];
  for(let raw of lines){
    raw=raw.trim();
    if(raw.startsWith('</')) indent=Math.max(0, indent-1);
    out.push('  '.repeat(indent)+raw);
    if(raw.startsWith('<') && !raw.startsWith('</') && !raw.endsWith('/>') && !raw.includes('</')){
      // check not self-closing
      const tag=/<(\w+)/.exec(raw);
      if(tag && !['br','hr','img','input','meta','link'].includes(tag[1].toLowerCase())) indent++;
    }
  }
  return out.join('\n');
}
function prettyHtml(html:string): string {
  // slightly more faithful: keep attributes, handle comments
  let s = html.replace(/></g,'>\n<').replace(/<!--/g,'\n<!--').replace(/-->/g,'-->\n');
  const lines=s.split('\n').map(l=>l.trim()).filter(Boolean);
  let indent=0;
  const out:string[]=[];
  for(const raw of lines){
    if(raw.startsWith('</')) indent=Math.max(0, indent-1);
    out.push('  '.repeat(indent)+raw);
    if(raw.startsWith('<') && !raw.startsWith('</') && !raw.startsWith('<!--') && !raw.endsWith('/>') && !/^<.*\/>$/.test(raw)){
      const isClosing = raw.includes('</');
      if(!isClosing) indent++;
    }
  }
  return out.join('\n');
}

function fastCss(css:string): string {
  return css.replace(/\s*{\s*/g,' {\n  ').replace(/\s*;\s*/g,';\n  ').replace(/\s*}\s*/g,'\n}\n').replace(/\n\s*\n/g,'\n').trim();
}
function prettyCss(css:string): string {
  let s=css.replace(/\/\*[\s\S]*?\*\//g,(m)=>`\n${m}\n`);
  s=fastCss(s);
  // ensure empty lines trimmed etc
  return s.split('\n').map(l=>l.trimEnd()).join('\n').trim();
}

function fastJs(js:string): string {
  // very naive: add newlines after ; and { }
  return js.replace(/;\s*/g,';\n').replace(/{\s*/g,' {\n  ').replace(/}\s*/g,'\n}\n').replace(/\n\s*\n/g,'\n').trim();
}
function prettyJs(js:string): string {
  // attempt: reuse JSON for json subset, else simple indent with bracket tracking
  try{
    const parsed=JSON.parse(js);
    return JSON.stringify(parsed,null,2);
  }catch{}
  let indent=0;
  let out='';
  for(let i=0;i<js.length;i++){
    const c=js[i];
    if(c==='{'||c==='['){ out+=c+'\n'+'  '.repeat(++indent); }
    else if(c==='}'||c===']'){ out+='\n'+'  '.repeat(--indent)+c; }
    else if(c===';'){ out+=';\n'+'  '.repeat(indent); }
    else if(c===','){ out+=',\n'+'  '.repeat(indent); }
    else out+=c;
  }
  return out.replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
}

function minifyCss(css:string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\s+/g,' ').replace(/\s*{\s*/g,'{').replace(/\s*}\s*/g,'}').replace(/\s*;\s*/g,';').replace(/\s*:\s*/g,':').replace(/\s*,\s*/g,',').trim();
}
function minifyJs(js:string): string {
  return js.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/.*$/gm,'').replace(/\s+/g,' ').replace(/\s*([{}();,:=+\-*\/])\s*/g,'$1').trim();
}
function minifyHtml(html:string): string {
  return html.replace(/<!--[\s\S]*?-->/g,'').replace(/\s+/g,' ').replace(/>\s+</g,'><').trim();
}

export function beautify(code:string, lang:BeautifyLang, engine:BeautifyEngine): string {
  if(lang==='html') return engine==='pretty'? prettyHtml(code): fastHtml(code);
  if(lang==='css') return engine==='pretty'? prettyCss(code): fastCss(code);
  if(lang==='js') return engine==='pretty'? prettyJs(code): fastJs(code);
  if(lang==='json') {
    try{ return JSON.stringify(JSON.parse(code), null, engine==='pretty'?2:4)}catch{ return code}
  }
  return code;
}
export function minify(code:string, lang:BeautifyLang): string {
  if(lang==='css') return minifyCss(code);
  if(lang==='js') return minifyJs(code);
  if(lang==='html') return minifyHtml(code);
  if(lang==='json') try{ return JSON.stringify(JSON.parse(code))}catch{ return code}
  return code;
}
