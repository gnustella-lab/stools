export interface PdfInspectResult {
  info: Record<string, string>;
  hasXmp: boolean;
  hasInfo: boolean;
  pageCountHint: number | null;
  warnings: string[];
  cleanedBlob?: Blob;
}

function decodePdfString(raw: string): string {
  // handle () and <> hex strings
  if (raw.startsWith('(')) {
    // simple: strip parens, unescape
    return raw.slice(1, -1).replace(/\\([nrtbf()\\])/g, (_m, c) => ({ n: '\n', r: '\r', t: '\t', b: '\b', f: '\f' }[c as string] ?? c));
  }
  if (raw.startsWith('<') && raw.endsWith('>')) {
    const hex = raw.slice(1, -1).replace(/\s+/g, '');
    if (/^[0-9a-fA-F]+$/.test(hex)) {
      try {
        const bytes = Uint8Array.from(hex.match(/.{1,2}/g)!.map(b => parseInt(b, 16)));
        // try UTF-16BE BOM
        if (bytes[0] === 0xfe && bytes[1] === 0xff) {
          return new TextDecoder('utf-16be').decode(bytes.slice(2));
        }
        return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
      } catch {
        return hex;
      }
    }
  }
  return raw;
}

export function inspectPdfBytes(bytes: Uint8Array): PdfInspectResult {
  const text = new TextDecoder('latin1').decode(bytes);
  if (!text.startsWith('%PDF')) throw new Error('Not a PDF file (missing %PDF header).');

  const info: Record<string, string> = {};
  const infoRe = /\/Info\s+(\d+\s+\d+\s+R)/g;
  const hasInfoRef = infoRe.test(text);

  // Find Info object directly: look for << ... /Title (...) ... >>
  // Extract dictionary entries with string values
  // generic scan for known keys
  const keys = ['Title', 'Author', 'Subject', 'Keywords', 'Creator', 'Producer', 'CreationDate', 'ModDate'];
  for (const key of keys) {
    const re = new RegExp(`/${key}\\s*(\\([^)]*\\)|<[^>]*>|\\S+)`, 'g');
    const hit = re.exec(text);
    if (hit) {
      info[key] = decodePdfString(hit[1]).slice(0, 500);
    }
  }

  const hasXmp = text.includes('/Metadata') || text.includes('http://ns.adobe.com/xap/1.0/');
  const hasInfo = hasInfoRef || Object.keys(info).length > 0;

  // page count heuristic: count /Type /Page not /Pages
  const pages = (text.match(/\/Type\s*\/Page\b(?!s)/g) ?? []).length;
  const pageCountHint = pages > 0 ? pages : null;

  const warnings: string[] = [];
  if (!hasInfo && !hasXmp) warnings.push('No Info dictionary or XMP found — file may already be clean or uses object streams.');
  if (hasXmp) warnings.push('XMP metadata stream present — will be removed by cleaner.');
  if (Object.keys(info).length) warnings.push('Info dictionary entries found — author/creator can leak identity.');
  if (text.includes('/EmbeddedFile')) warnings.push('Embedded files detected — not removed by metadata cleaner.');
  warnings.push('Cleaning rewrites Info/XMP only. Review output before sharing; object streams may hide data.');

  return { info, hasXmp, hasInfo, pageCountHint, warnings };
}

export function stripPdfMetadata(bytes: Uint8Array): { blob: Blob; removed: string[] } {
  const text = new TextDecoder('latin1').decode(bytes);
  if (!text.startsWith('%PDF')) throw new Error('Not a PDF file.');

  const removed: string[] = [];
  let cleaned = text;

  // Remove Info dict reference: /Info 5 0 R  -> keep but empty? Better remove reference
  // Safer: replace /Info ... with empty, and clear Info object content
  // Strategy: find Info object (e.g., "5 0 obj << ... >> endobj") and empty it
  const infoRefRe = /\/Info\s+\d+\s+\d+\s+R/;
  if (infoRefRe.test(cleaned)) {
    cleaned = cleaned.replace(infoRefRe, '');
    removed.push('Info reference');
  }

  // Find and empty Info object dictionaries
  // Heuristic: objects containing /Title or /Author or /Creator or /Producer
  cleaned = cleaned.replace(/(\d+\s+\d+\s+obj\s*<<[^>]*\/(Title|Author|Creator|Producer|Subject|Keywords)[^>]*>>\s*endobj)/g, (match) => {
    removed.push('Info object');
    // replace with empty object
    const header = match.match(/^\d+\s+\d+\s+obj/)?.[0] ?? '1 0 obj';
    return `${header}\n<< >>\nendobj`;
  });

  // Remove XMP Metadata streams: /Type /Metadata ... stream ... endstream
  const xmpStreamRe = /\d+\s+\d+\s+obj\s*<<[^>]*\/Type\s*\/Metadata[^>]*>>\s*stream[\s\S]*?endstream\s*endobj/g;
  const xmpHits = cleaned.match(xmpStreamRe)?.length ?? 0;
  if (xmpHits) {
    cleaned = cleaned.replace(xmpStreamRe, (m) => {
      const header = m.match(/^\d+\s+\d+\s+obj/)?.[0] ?? '1 0 obj';
      return `${header}\n<< >>\nendobj`;
    });
    removed.push(`XMP Metadata stream(s) x${xmpHits}`);
  }

  // Also remove /Metadata reference entries
  cleaned = cleaned.replace(/\/Metadata\s+\d+\s+\d+\s+R/g, () => {
    if (!removed.includes('Metadata reference')) removed.push('Metadata reference');
    return '';
  });

  if (removed.length === 0) throw new Error('No removable Info/XMP metadata found. File may use object streams or is already clean.');

  // Note: we do not rebuild xref offsets — most readers accept it; we warn
  const blob = new Blob([cleaned], { type: 'application/pdf' });
  return { blob, removed };
}

export async function inspectPdfFile(file: File): Promise<PdfInspectResult> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  return inspectPdfBytes(bytes);
}

export async function cleanPdfFile(file: File): Promise<{ blob: Blob; removed: string[]; info: Record<string, string> }> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const inspected = inspectPdfBytes(bytes);
  const { blob, removed } = stripPdfMetadata(bytes);
  return { blob, removed, info: inspected.info };
}
