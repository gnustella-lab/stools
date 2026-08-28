export interface SvgOptimizeResult {
  originalSize: number;
  optimizedSize: number;
  saved: number;
  savedPercent: number;
  cleaned: string;
  removed: string[];
  warnings: string[];
}

export function optimizeSvg(input: string, opts: { precision?: number; removeComments?: boolean } = {}): SvgOptimizeResult {
  const precision = opts.precision ?? 2;
  const removeComments = opts.removeComments ?? true;
  const trimmed = input.trim();
  if (!trimmed) throw new Error('Paste SVG content.');
  if (!trimmed.includes('<svg')) throw new Error('Input does not look like SVG.');

  let cleaned = trimmed;
  const removed: string[] = [];
  const warnings: string[] = [];
  const originalSize = new TextEncoder().encode(trimmed).length;

  if (removeComments) {
    const before = cleaned;
    cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');
    if (cleaned.length !== before.length) removed.push('Comments');
  }

  // remove metadata, title? keep title? remove metadata
  if (cleaned.includes('<metadata')) {
    cleaned = cleaned.replace(/<metadata[\s\S]*?<\/metadata>/gi, '');
    removed.push('<metadata>');
  }
  if (cleaned.includes('<desc') && cleaned.length < 200000) {
    // keep desc if short? we remove empty
    const before = cleaned;
    cleaned = cleaned.replace(/<desc>\s*<\/desc>/gi, '');
    if (before !== cleaned) removed.push('Empty <desc>');
  }

  // remove editor namespaces and attributes
  const editorAttrs = ['data-name', 'sketch:type', 'inkscape:', 'sodipodi:', 'xmlns:inkscape', 'xmlns:sodipodi'];
  for (const attr of editorAttrs) {
    if (cleaned.includes(attr)) {
      // best-effort remove attributes containing attr
      const re = new RegExp(`\\s+[^\\s=]*${attr.replace(':', ':')}[^\\s=]*="[^"]*"`, 'gi');
      const before = cleaned;
      cleaned = cleaned.replace(re, '');
      if (before !== cleaned) removed.push(`Editor attrs ${attr}`);
    }
  }

  // collapse whitespace between tags
  cleaned = cleaned.replace(/>\s+</g, '><').replace(/\s{2,}/g, ' ');

  // round numbers in d attribute and generic numbers
  if (precision >= 0) {
    cleaned = cleaned.replace(/(\d+\.\d+)/g, (m) => {
      const n = parseFloat(m);
      return Number.isFinite(n) ? n.toFixed(precision).replace(/\.?0+$/, '') : m;
    });
  }

  // remove empty attrs like fill="none" keeping? keep
  // remove hidden style?
  // normalize viewBox if missing and width/height present — add viewBox
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(cleaned, 'image/svg+xml');
    const svg = doc.querySelector('svg');
    if (svg) {
      if (!svg.getAttribute('viewBox') && svg.getAttribute('width') && svg.getAttribute('height')) {
        const w = svg.getAttribute('width')?.replace('px', '') ?? '0';
        const h = svg.getAttribute('height')?.replace('px', '') ?? '0';
        if (!isNaN(Number(w)) && !isNaN(Number(h))) {
          svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
          removed.push('Added viewBox from width/height');
        }
      }
      // remove width/height if viewBox present? keep for flexibility
      const ser = new XMLSerializer();
      cleaned = ser.serializeToString(doc);
    }
  } catch {
    warnings.push('SVG structure warning — output may need manual check.');
  }

  const optimizedSize = new TextEncoder().encode(cleaned).length;
  const saved = originalSize - optimizedSize;
  const savedPercent = originalSize ? Math.round((saved / originalSize) * 1000) / 10 : 0;

  if (saved <= 0) warnings.push('No size saved — SVG already optimized or contains mostly path data.');
  if (cleaned.length > 500000) warnings.push('Large SVG (>500KB) — consider splitting or simplifying paths.');

  return { originalSize, optimizedSize, saved, savedPercent, cleaned, removed, warnings };
}
