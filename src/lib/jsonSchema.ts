// Minimal JSON Schema validator — supports type, required, properties, items, enum, minimum/maximum, minLength/maxLength, pattern, additionalProperties
export interface ValidationResult { valid: boolean; errors: string[] }

function typeOf(v:unknown): string {
  if (v===null) return 'null';
  if (Array.isArray(v)) return 'array';
  return typeof v;
}

export function validateJsonSchema(schemaRaw: string, dataRaw: string): ValidationResult & { schemaError?: string; dataError?: string } {
  let schema: unknown;
  let data: unknown;
  try { schema = JSON.parse(schemaRaw); } catch(e){ return {valid:false, errors:[], schemaError: e instanceof Error?e.message:String(e), dataError: undefined}}
  try { data = JSON.parse(dataRaw); } catch(e){ return {valid:false, errors:[], schemaError: undefined, dataError: e instanceof Error?e.message:String(e)}}
  const errors: string[] = [];
  validate(data, schema, '$', errors);
  return {valid: errors.length===0, errors};
}

function validate(data: unknown, schema: unknown, path:string, errors:string[]): void {
  if (!schema || typeof schema !== 'object') return;
  const s = schema as Record<string, unknown>;
  // type
  if (s.type) {
    const expected = s.type;
    const actual = typeOf(data);
    const types = Array.isArray(expected) ? expected as string[] : [expected as string];
    // integer special
    const ok = types.some(t=> t==='integer' ? typeof data==='number' && Number.isInteger(data as number) : t===actual);
    if (!ok) { errors.push(`${path}: expected type ${types.join('|')} but got ${actual}`); return; }
  }
  if (s.enum) {
    const en = s.enum as unknown[];
    if (!en.some(v=> JSON.stringify(v)===JSON.stringify(data))) errors.push(`${path}: value not in enum ${JSON.stringify(en)}`);
  }
  if (typeof data==='string') {
    if (typeof s.minLength==='number' && (data as string).length < (s.minLength as number)) errors.push(`${path}: minLength ${s.minLength}`);
    if (typeof s.maxLength==='number' && (data as string).length > (s.maxLength as number)) errors.push(`${path}: maxLength ${s.maxLength}`);
    if (typeof s.pattern==='string') {
      try { if (!new RegExp(s.pattern as string).test(data as string)) errors.push(`${path}: pattern ${s.pattern} mismatch`)} catch{}
    }
  }
  if (typeof data==='number') {
    if (typeof s.minimum==='number' && (data as number) < (s.minimum as number)) errors.push(`${path}: minimum ${s.minimum}`);
    if (typeof s.maximum==='number' && (data as number) > (s.maximum as number)) errors.push(`${path}: maximum ${s.maximum}`);
    if (typeof s.exclusiveMinimum==='number' && (data as number) <= (s.exclusiveMinimum as number)) errors.push(`${path}: exclusiveMinimum ${s.exclusiveMinimum}`);
    if (typeof s.exclusiveMaximum==='number' && (data as number) >= (s.exclusiveMaximum as number)) errors.push(`${path}: exclusiveMaximum ${s.exclusiveMaximum}`);
  }
  if (Array.isArray(data) && s.items) {
    if (Array.isArray(s.items)) { /* tuple */ } else {
      (data as unknown[]).forEach((item,i)=> validate(item, s.items, `${path}[${i}]`, errors));
    }
    if (typeof s.minItems==='number' && (data.length < (s.minItems as number))) errors.push(`${path}: minItems ${s.minItems}`);
    if (typeof s.maxItems==='number' && (data.length > (s.maxItems as number))) errors.push(`${path}: maxItems ${s.maxItems}`);
  }
  if (data && typeof data==='object' && !Array.isArray(data)){
    const obj = data as Record<string,unknown>;
    if (Array.isArray(s.required)){
      for(const req of s.required as string[]) if(!(req in obj)) errors.push(`${path}: missing required '${req}'`);
    }
    if (s.properties && typeof s.properties==='object'){
      const props = s.properties as Record<string,unknown>;
      for(const [k, subSchema] of Object.entries(props)){
        if(k in obj) validate(obj[k], subSchema, `${path}.${k}`, errors);
      }
      if (s.additionalProperties===false){
        for(const k of Object.keys(obj)) if(!(k in props)) errors.push(`${path}: additional property '${k}' not allowed`);
      }
    }
  }
}
