// Pure local YAML ↔ JSON. Best-effort covering common subset; honest limits noted in UI.
export interface ConvertResult {
  output: string;
  error: string | null;
}

function inferType(v: string): unknown {
  const t = v.trim();
  if (t === 'null' || t === '~' || t === '') return null;
  if (t === 'true') return true;
  if (t === 'false') return false;
  if (/^-?\d+$/.test(t)) return parseInt(t, 10);
  if (/^-?\d*\.\d+$/.test(t)) return parseFloat(t);
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) return t.slice(1, -1);
  return t;
}

function parseSimpleYaml(yaml: string): unknown {
  const lines = yaml.split(/\r?\n/);
  // Very small parser: supports mappings and sequences at root; indentation based
  // For robustness, handle JSON-like values as well.
  // Detect simple key: value per line; handle lists with "- item"
  const root: Record<string, unknown> = {};
  let currentList: unknown[] | null = null;
  const stack: Array<{indent:number, obj:Record<string,unknown>}> = [{indent:-1, obj: root}];

  for (const raw of lines) {
    if (!raw.trim() || raw.trim().startsWith('#')) continue;
    const indent = raw.search(/\S/);
    const trimmed = raw.trim();
    // list item
    if (trimmed.startsWith('- ')) {
      const val = trimmed.slice(2).trim();
      // find parent for list
      if (currentList) {
        if (val.includes(':')) {
          const [k, ...rest] = val.split(':');
          const vv = rest.join(':').trim();
          currentList.push({[k.trim()]: vv ? inferType(vv) : null});
        } else {
          currentList.push(inferType(val));
        }
        continue;
      }
      // anonymous list at root not supported -> treat as array under _list
      if (!root._list) root._list = [];
      (root._list as unknown[]).push(inferType(val));
      continue;
    }
    const colon = trimmed.indexOf(':');
    if (colon === -1) continue;
    const key = trimmed.slice(0, colon).trim();
    const rawVal = trimmed.slice(colon + 1).trim();
    // pop stack to indent
    while (stack.length >1 && indent <= stack[stack.length-1].indent) stack.pop();
    const parent = stack[stack.length-1].obj;
    if (rawVal === '' || rawVal === '|' || rawVal === '>') {
      // nested object or list expected
      const nextObj: Record<string, unknown> = {};
      // peek next non-empty line to see if it's a list
      const idx = lines.indexOf(raw);
      let isList = false;
      for (let j=idx+1;j<lines.length;j++) {
        const l = lines[j];
        if (!l.trim() || l.trim().startsWith('#')) continue;
        if (l.trim().startsWith('- ')) isList=true;
        break;
      }
      if (isList) {
        const arr: unknown[] = [];
        parent[key] = arr;
        currentList = arr;
        // push marker for indentation
        stack.push({indent, obj: parent});
      } else {
        parent[key] = nextObj;
        currentList = null;
        stack.push({indent, obj: nextObj});
        // set current object for nesting
        stack[stack.length-1].obj = nextObj;
        // also keep stack entry for child
        // Instead, push new level
        // We already pushed parent, now push child?
        // Simplify: push child with same indent
        // Actually we want child to be current parent for next lines
        // So replace last entry with child
        stack[stack.length-1] = {indent, obj: parent};
        stack.push({indent, obj: nextObj});
      }
    } else {
      // inline array like [a, b] ?
      if (rawVal.startsWith('[') && rawVal.endsWith(']')) {
        const inner = rawVal.slice(1,-1).trim();
        if (!inner) parent[key]=[];
        else parent[key]=inner.split(',').map(s=>inferType(s.trim()));
      } else {
        parent[key]=inferType(rawVal);
      }
      currentList=null;
    }
  }
  // if only _list, return that list
  if (Object.keys(root).length===1 && '_list' in root) return root._list;
  return root;
}

export function yamlToJson(yaml: string): ConvertResult {
  if (!yaml.trim()) return {output:'', error:null};
  try {
    // if input is already JSON, just pass through? But treat as yaml
    // try JSON first? no, yaml superset
    const parsed = parseSimpleYaml(yaml);
    // if parse returned empty object but input contained only json, fallback to JSON.parse
    if (parsed && typeof parsed === 'object' && Object.keys(parsed as object).length===0) {
      try {
        const j = JSON.parse(yaml);
        return {output: JSON.stringify(j, null, 2), error:null};
      } catch { /* ignore */ }
    }
    return {output: JSON.stringify(parsed, null, 2), error:null};
  } catch (e) {
    return {output:'', error: e instanceof Error ? e.message : String(e)};
  }
}

function jsonValueToYaml(v: unknown, indent=0): string {
  const pad = '  '.repeat(indent);
  if (v === null) return 'null';
  if (typeof v === 'boolean') return v ? 'true':'false';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'string') {
    if (v === '' || /[:#\-\n]/.test(v) || /^\s/.test(v) || /\s$/.test(v)) return JSON.stringify(v);
    if (/^(true|false|null|~|\d+(\.\d+)?)$/.test(v)) return JSON.stringify(v);
    return v;
  }
  if (Array.isArray(v)) {
    if (v.length===0) return '[]';
    return '\n' + v.map(item => `${pad}- ${jsonValueToYaml(item, indent+1).replace(/^\n/, '').trimStart()}`).join('\n');
  }
  if (typeof v === 'object') {
    const obj = v as Record<string,unknown>;
    const keys = Object.keys(obj);
    if (keys.length===0) return '{}';
    return '\n' + keys.map(k => {
      const val = obj[k];
      const yamlVal = jsonValueToYaml(val, indent+1);
      if (yamlVal.startsWith('\n')) return `${pad}${k}:${yamlVal}`;
      return `${pad}${k}: ${yamlVal}`;
    }).join('\n');
  }
  return String(v);
}

export function jsonToYaml(jsonText: string): ConvertResult {
  if (!jsonText.trim()) return {output:'', error:null};
  try {
    const parsed = JSON.parse(jsonText);
    if (Array.isArray(parsed)) {
      const out = parsed.map(item => `- ${jsonValueToYaml(item,1).replace(/^\n/, '').trimStart()}`).join('\n');
      return {output: out, error:null};
    }
    const out = jsonValueToYaml(parsed,0).replace(/^\n/, '');
    return {output: out, error:null};
  } catch (e) {
    return {output:'', error: e instanceof Error ? e.message : String(e)};
  }
}
