// Minimal SQL formatter — keywords uppercase, line breaks.

const KEYWORDS = [
  'SELECT','FROM','WHERE','GROUP BY','ORDER BY','HAVING','LIMIT','OFFSET','JOIN','LEFT JOIN','RIGHT JOIN','INNER JOIN','OUTER JOIN','UNION','INSERT INTO','VALUES','UPDATE','SET','DELETE FROM','CREATE TABLE','ALTER TABLE','DROP TABLE','AND','OR','ON','AS','IN','IS','NULL','NOT','EXISTS','BETWEEN','LIKE','CASE','WHEN','THEN','ELSE','END'
];

export function formatSql(sql: string): string {
  let s = sql.trim();
  // collapse whitespace
  s = s.replace(/\s+/g,' ');
  // uppercase keywords
  for(const kw of [...KEYWORDS].sort((a,b)=>b.length-a.length)){
    const re = new RegExp(`\\b${kw.replace(/\s+/g,'\\s+')}\\b`, 'gi');
    s = s.replace(re, kw);
  }
  // inserts
  s = s.replace(/\s*,\s*/g,', ');
  // line breaks before major keywords
  const major = ['SELECT','FROM','WHERE','GROUP BY','ORDER BY','HAVING','LIMIT','OFFSET','JOIN','LEFT JOIN','RIGHT JOIN','INNER JOIN','UNION','INSERT INTO','VALUES','UPDATE','SET','DELETE FROM'];
  for(const m of major){
    const re = new RegExp(`\\s*\\b${m.replace(' ', '\\s+')}\\b\\s*`, 'g');
    s = s.replace(re, `\n${m} `);
  }
  // break AND/OR in WHERE
  s = s.replace(/\s+AND\s+/g,'\n  AND ').replace(/\s+OR\s+/g,'\n  OR ');
  // handle parentheses indent
  const lines = s.split('\n').map(l=>l.trim()).filter(Boolean);
  let indent=0;
  const out:string[]=[];
  for(const line of lines){
    if(line.startsWith(')')) indent=Math.max(0,indent-1);
    out.push('  '.repeat(indent)+line);
    const opens = (line.match(/\(/g)||[]).length;
    const closes = (line.match(/\)/g)||[]).length;
    indent+=opens-closes;
    if(indent<0) indent=0;
  }
  return out.join('\n').trim() + (sql.trim().endsWith(';')?'':';' .slice(0,0)); // keep original semicolon?
}

export function minifySql(sql: string): string {
  return sql.replace(/\s+/g,' ').replace(/\s*([(),=<>])\s*/g,'$1').trim();
}
