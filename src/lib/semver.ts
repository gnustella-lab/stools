// Simple semver parse/compare

export interface SemVer { major:number; minor:number; patch:number; prerelease?:string; build?:string; raw:string }

export function parseSemver(v:string): SemVer|null {
  const raw=v.trim().replace(/^v/,'');
  const m=/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-.]+))?(?:\+([0-9A-Za-z-.]+))?$/.exec(raw);
  if(!m) return null;
  return {major:parseInt(m[1],10), minor:parseInt(m[2],10), patch:parseInt(m[3],10), prerelease:m[4], build:m[5], raw: v.trim()};
}

export function compareSemver(a:SemVer,b:SemVer): number {
  if(a.major!==b.major) return a.major-b.major;
  if(a.minor!==b.minor) return a.minor-b.minor;
  if(a.patch!==b.patch) return a.patch-b.patch;
  // prerelease: no prerelease > prerelease
  if(!a.prerelease && b.prerelease) return 1;
  if(a.prerelease && !b.prerelease) return -1;
  if(a.prerelease && b.prerelease){
    if(a.prerelease<b.prerelease) return -1;
    if(a.prerelease>b.prerelease) return 1;
  }
  return 0;
}

export function diffSemver(a:string,b:string): string {
  const pa=parseSemver(a); const pb=parseSemver(b);
  if(!pa||!pb) return 'Uma das versões é inválida (esperado x.y.z)';
  if(pa.major!==pb.major) return 'major — breaking change';
  if(pa.minor!==pb.minor) return 'minor — feature';
  if(pa.patch!==pb.patch) return 'patch — fix';
  if(pa.prerelease!==pb.prerelease) return 'prerelease diff';
  return 'iguais';
}

export function satisfiesRange(version:string, range:string): {satisfies:boolean, reason:string} {
  const ver=parseSemver(version);
  if(!ver) return {satisfies:false, reason:'versão inválida'};
  range=range.trim();
  if(range==='*'||range==='x') return {satisfies:true, reason:'* aceita qualquer'};
  // handle ^, ~, >= etc simples
  if(range.startsWith('^')){
    const base=parseSemver(range.slice(1));
    if(!base) return {satisfies:false, reason:'range inválido'};
    if(ver.major!==base.major) return {satisfies:false, reason:`major deve ser ${base.major}`};
    return {satisfies: compareSemver(ver, base)>=0, reason: `^${base.raw} compatível se >=${base.raw} e <${base.major+1}.0.0`};
  }
  if(range.startsWith('~')){
    const base=parseSemver(range.slice(1));
    if(!base) return {satisfies:false, reason:'range inválido'};
    if(ver.major!==base.major||ver.minor!==base.minor) return {satisfies:false, reason:`deve manter ${base.major}.${base.minor}.x`};
    return {satisfies: compareSemver(ver, base)>=0, reason:`~ ${base.raw}`};
  }
  if(range.startsWith('>=')){
    const base=parseSemver(range.slice(2));
    if(!base) return {satisfies:false, reason:'range inválido'};
    return {satisfies: compareSemver(ver, base)>=0, reason:`>=${base.raw}`};
  }
  if(range.startsWith('>')){
    const base=parseSemver(range.slice(1));
    if(!base) return {satisfies:false, reason:'range inválido'};
    return {satisfies: compareSemver(ver, base)>0, reason:`>${base.raw}`};
  }
  if(range.startsWith('<=')){
    const base=parseSemver(range.slice(2));
    if(!base) return {satisfies:false, reason:'range inválido'};
    return {satisfies: compareSemver(ver, base)<=0, reason:`<=${base.raw}`};
  }
  if(range.startsWith('<')){
    const base=parseSemver(range.slice(1));
    if(!base) return {satisfies:false, reason:'range inválido'};
    return {satisfies: compareSemver(ver, base)<0, reason:`<${base.raw}`};
  }
  // exact
  const base=parseSemver(range);
  if(base) return {satisfies: compareSemver(ver, base)===0, reason:'igualdade exata'};
  return {satisfies:false, reason:'range não suportado (suporta ^ ~ >= > <= < e exata)'};
}
