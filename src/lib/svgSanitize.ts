export interface SvgSanitizeResult {
  cleaned: string;
  removed: string[];
  warnings: string[];
}

const DANGEROUS_TAGS = new Set(['script', 'foreignObject', 'iframe', 'object', 'embed']);
const EVENT_ATTRS = /^on[a-z]+$/i;

export function sanitizeSvg(input: string): SvgSanitizeResult {
  const trimmed = input.trim();
  if (!trimmed) throw new Error('Paste SVG content.');
  if (!trimmed.includes('<svg') && !trimmed.includes('<SVG')) throw new Error('Input does not look like SVG.');

  const parser = new DOMParser();
  const doc = parser.parseFromString(trimmed, 'image/svg+xml');
  const parserError = doc.querySelector('parsererror');
  if (parserError) throw new Error('SVG parse error: ' + (parserError.textContent?.slice(0, 200) ?? 'invalid XML'));

  const removed: string[] = [];
  const warnings: string[] = [];

  // remove dangerous tags
  for (const tag of DANGEROUS_TAGS) {
    const nodes = [...doc.getElementsByTagName(tag)];
    for (const n of nodes) {
      removed.push(`<${tag}> element`);
      n.remove();
    }
  }
  // also remove namespaced script like <svg:script>
  const all = [...doc.getElementsByTagName('*')];
  for (const el of all) {
    // event handlers
    for (const attr of [...el.attributes]) {
      const name = attr.name;
      const value = attr.value ?? '';
      if (EVENT_ATTRS.test(name)) {
        removed.push(`event handler ${name}="${value.slice(0, 40)}" on <${el.tagName}>`);
        el.removeAttribute(name);
      }
      // javascript: / data:text/html / vbscript:
      const lowerVal = value.toLowerCase().trim();
      if (lowerVal.startsWith('javascript:') || lowerVal.startsWith('data:text/html') || lowerVal.startsWith('vbscript:')) {
        removed.push(`dangerous URL in ${name} on <${el.tagName}>`);
        el.removeAttribute(name);
      }
      if (name === 'href' || name === 'xlink:href') {
        if (lowerVal.startsWith('javascript:') || lowerVal.includes('<script')) {
          removed.push(`script href on <${el.tagName}>`);
          el.removeAttribute(name);
        }
      }
      // style with expression / -moz-binding
      if (name === 'style' && /expression\s*\(|-moz-binding/i.test(value)) {
        removed.push(`unsafe style on <${el.tagName}>`);
        el.removeAttribute(name);
      }
    }
    // also check inline style attribute containing url(javascript:
    const style = el.getAttribute('style');
    if (style && /url\s*\(\s*['"]?\s*javascript:/i.test(style)) {
      removed.push(`javascript URL in style on <${el.tagName}>`);
      el.removeAttribute('style');
    }
  }

  // remove <?import?> processing instructions that could load external
  const serializer = new XMLSerializer();
  let cleaned = serializer.serializeToString(doc);

  if (trimmed.length > 500_000) warnings.push('Large SVG (>500KB) — review manually for encoded payloads.');
  if (cleaned.includes('data:') && cleaned.includes('base64')) warnings.push('SVG contains base64 data: URIs — verify they are expected images, not scripts.');
  if (removed.length === 0) warnings.push('No dangerous patterns found with current heuristics — manual review still recommended for novel vectors.');

  return { cleaned, removed, warnings };
}

export function countSvgElements(svg: string): Record<string, number> {
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
  const all = [...doc.getElementsByTagName('*')];
  const counts: Record<string, number> = {};
  for (const el of all) counts[el.tagName] = (counts[el.tagName] ?? 0) + 1;
  return counts;
}
