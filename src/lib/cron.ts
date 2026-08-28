// Simple cron parser & explainer for 5-field standard cron (minute hour dom month dow)

export interface CronPart { raw:string; valid:boolean; error?:string }
export interface CronExplain { valid:boolean; error?:string; description:string; fields: Record<string,CronPart> }

const MONTHS = ['','JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const DOWS = ['SUN','MON','TUE','WED','THU','FRI','SAT'];

function expandField(raw:string, min:number, max:number): {valid:boolean, error?:string}{
  if(raw==='*'||raw==='?') return {valid:true};
  const parts = raw.split(',');
  for(const p of parts){
    let seg=p.trim();
    // step
    let step: string|undefined;
    if(seg.includes('/')){
      const [base, s]=seg.split('/');
      seg=base; step=s;
      if(!/^\d+$/.test(step)) return {valid:false, error:`step '${step}' inválido`};
    }
    if(seg==='*') continue;
    // range
    if(seg.includes('-')){
      const [a,b]=seg.split('-').map(s=>s.trim());
      const ai=parseInt(a,10), bi=parseInt(b,10);
      if(isNaN(ai)||isNaN(bi)||ai<min||bi>max||ai>bi) return {valid:false, error:`range ${seg} fora de [${min}-${max}]`};
      // also allow month/DOW names
      continue;
    }
    // allow names for month/dow
    if (/^[A-Z]{3}$/i.test(seg)) continue;
    if (!/^\d+$/.test(seg)) return {valid:false, error:`valor '${seg}' inválido`};
    const v=parseInt(seg,10);
    if(v<min||v>max) return {valid:false, error:`${v} fora de [${min}-${max}]`};
  }
  return {valid:true};
}

export function parseCron(expr:string): CronExplain {
  const raw = expr.trim().replace(/\s+/g,' ');
  const fields = raw.split(' ');
  if (fields.length!==5 && fields.length!==6) return {valid:false, description:'', error:`Cron deve ter 5 campos (min hour dom month dow) — recebeu ${fields.length}`, fields:{}};
  // support 6 fields (sec) by dropping first if 6?
  const is6 = fields.length===6;
  const parts = is6 ? fields.slice(1) : fields;
  const [min,hour,dom,mon,dow] = parts;
  const checks: Record<string,CronPart> = {};
  const rMin = expandField(min,0,59);
  checks.minute={raw:min, valid:rMin.valid, error:rMin.error};
  const rHour = expandField(hour,0,23);
  checks.hour={raw:hour, valid:rHour.valid, error:rHour.error};
  const rDom = expandField(dom,1,31);
  checks.dom={raw:dom, valid:rDom.valid, error:rDom.error};
  const rMon = expandField(mon,1,12);
  checks.month={raw:mon, valid:rMon.valid, error:rMon.error};
  const rDow = expandField(dow,0,7);
  checks.dow={raw:dow, valid:rDow.valid, error:rDow.error};
  const allValid = Object.values(checks).every(c=>c.valid);
  if(!allValid){
    const firstErr = Object.values(checks).find(c=>!c.valid)?.error;
    return {valid:false, error:firstErr, description:'', fields:checks};
  }
  const desc = describe(min,hour,dom,mon,dow);
  return {valid:true, description:desc, fields:checks};
}

function describe(min:string,hour:string,dom:string,mon:string,dow:string): string {
  const parts:string[]=[];
  if(min==='*'&&hour==='*') parts.push('a cada minuto');
  else if(min==='*' ) parts.push(`a cada minuto na hora ${hour}`);
  else if(hour==='*' ) parts.push(`no minuto ${min} de cada hora`);
  else parts.push(`às ${hour.padStart(2,'0')}:${min.padStart(2,'0')}`);

  if(dom!=='*' && mon!=='*') parts.push(`no dia ${dom} de ${mon}`);
  else if(dom!=='*') parts.push(`no dia ${dom} de cada mês`);
  else if(mon!=='*') {
    const mNames = mon.split(',').map(v=> MONTHS[parseInt(v,10)]||v).join(',');
    parts.push(`em ${mNames}`);
  }
  if(dow!=='*') {
    const dNames = dow.split(',').map(v=>{
      const n=parseInt(v,10);
      if(!isNaN(n)) return DOWS[n%7]??String(n);
      return v;
    }).join(',');
    parts.push(`em ${dNames}`);
  }
  // specials
  if(min.includes('/') ) parts.push(`(step ${min})`);
  if(hour.includes('/') ) parts.push(`(a cada ${hour.split('/')[1]}h)`);
  return parts.join(' ').replace(/\s+/g,' ').trim();
}

export function buildCron(opts: {minute:string, hour:string, dom:string, month:string, dow:string}): string {
  return `${opts.minute} ${opts.hour} ${opts.dom} ${opts.month} ${opts.dow}`;
}

export function nextRuns(expr: string, count=3): string[] {
  // naive next runs: iterate minutes? we just fake next 3 by saying every minute/day
  // Safer: return textual prediction, not real dates to avoid heavy calc.
  const parsed = parseCron(expr);
  if(!parsed.valid) return [];
  // try to compute real next times for simple patterns (*/n and fixed time)
  const now = new Date();
  const res:string[]=[];
  // brute force up to 7 days
  let cur = new Date(now.getTime() + 60_000);
  cur.setSeconds(0,0);
  let attempts=0;
  while(res.length<count && attempts< 60*24*7){
    if (matchesCron(cur, expr)) res.push(cur.toISOString());
    cur = new Date(cur.getTime() + 60_000);
    attempts++;
  }
  if(res.length===0) return [`(sem ocorrência nos próximos 7 dias — expr: ${expr})`];
  return res;
}

function matchesCron(d:Date, expr:string): boolean {
  const parts = expr.trim().split(/\s+/);
  const ff = parts.length===6 ? parts.slice(1) : parts;
  if(ff.length!==5) return false;
  const [min,hour,dom,mon,dow]=ff;
  return matchField(d.getMinutes(),min,0,59)
    && matchField(d.getHours(),hour,0,23)
    && matchField(d.getDate(),dom,1,31)
    && matchField(d.getMonth()+1,mon,1,12)
    && matchField(d.getDay(),dow,0,7);
}
function matchField(val:number, expr:string, _min:number, _max:number): boolean {
  if(expr==='*'||expr==='?') return true;
  const parts=expr.split(',');
  for(const p of parts){
    if(p.includes('/')){
      const [base,stepStr]=p.split('/');
      const step=parseInt(stepStr,10);
      if(base==='*'){ if(val%step===0) return true; }
      else if(base.includes('-')){
        const [a,b]=base.split('-').map(Number);
        if(val>=a && val<=b && (val-a)%step===0) return true;
      }
    } else if(p.includes('-')){
      const [a,b]=p.split('-').map(Number);
      if(val>=a && val<=b) return true;
    } else {
      if(parseInt(p,10)===val) return true;
      // allow 7 as 0 for dow
      if(_max===7 && parseInt(p,10)===7 && val===0) return true;
    }
  }
  return false;
}
