export interface MdFinding {
  severity: 'high' | 'medium' | 'low' | 'info';
  title: string;
  detail: string;
  evidence?: string;
}

export interface MdReport {
  htmlPreview: string;
  findings: MdFinding[];
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function mdToHtml(md: string): string {
  let html = escapeHtml(md);
  // headings
  html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');
  // bold/italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  // images ![alt](url)
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2">');
  // links [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  // auto-links <https://...>
  html = html.replace(/&lt;(https?:[^&]+)&gt;/g, '<a href="$1">$1</a>');
  // line breaks
  html = html.replace(/\n/g, '<br>');
  return html;
}

const TRACKER_PARAMS = ['utm_', 'fbclid', 'gclid', 'msclkid', 'ttclid', 'wbraid', 'gbraid', 'yclid', 'dclid', '_hsenc', '_hsmi', 'mc_eid', 'igshid'];
const TRACKER_DOMAINS = ['doubleclick.net', 'googletagmanager.com', 'google-analytics.com', 'facebook.net', 'hotjar', 'mixpanel', 'segment.'];

export function inspectMarkdown(md: string): MdReport {
  const trimmed = md.trim();
  if (!trimmed) throw new Error('Paste Markdown to inspect.');
  const html = mdToHtml(md);
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const findings: MdFinding[] = [];

  const images = [...doc.querySelectorAll('img')];
  const links = [...doc.querySelectorAll('a')];
  const scripts = [...doc.querySelectorAll('script')];

  for (const img of images) {
    const src = img.getAttribute('src') ?? '';
    if (!src) continue;
    if (/^https?:/.test(src) && !src.startsWith('data:')) {
      // external image can be tracker pixel
      if (src.match(/pixel|beacon|track|1x1/i)) {
        findings.push({ severity: 'high', title: 'Tracker image in Markdown', detail: `Image URL looks like tracker: ${src.slice(0, 80)}`, evidence: src.slice(0, 200) });
      } else {
        findings.push({ severity: 'medium', title: 'External image', detail: `Markdown loads external image — can leak IP when rendered: ${src.slice(0, 80)}`, evidence: src.slice(0, 200) });
      }
      for (const d of TRACKER_DOMAINS) {
        if (src.toLowerCase().includes(d)) {
          findings.push({ severity: 'high', title: 'Image from tracker domain', detail: `Domain ${d} in ${src.slice(0, 80)}`, evidence: src });
          break;
        }
      }
    }
    if (src.startsWith('data:')) {
      findings.push({ severity: 'low', title: 'Inline data image', detail: 'Embedded base64 image — no external request but increases size.', evidence: src.slice(0, 80) });
    }
  }

  let trackingLinks = 0;
  for (const a of links) {
    const href = a.getAttribute('href') ?? '';
    if (!href) continue;
    try {
      const url = new URL(href, 'http://example.invalid');
      for (const key of url.searchParams.keys()) {
        const lower = key.toLowerCase();
        if (TRACKER_PARAMS.some(p => lower.startsWith(p) || lower === p)) {
          trackingLinks++;
          break;
        }
      }
      if (TRACKER_DOMAINS.some(d => href.toLowerCase().includes(d))) {
        findings.push({ severity: 'medium', title: 'Link to tracker domain', detail: `Link points to ${href.slice(0, 80)}`, evidence: href.slice(0, 200) });
      }
      if (/^javascript:/i.test(href)) {
        findings.push({ severity: 'high', title: 'javascript: link', detail: 'Markdown contains javascript: URL — XSS vector.', evidence: href.slice(0, 200) });
      }
    } catch {
      // ignore
    }
  }
  if (trackingLinks) findings.push({ severity: 'medium', title: `${trackingLinks} link(s) with tracking params`, detail: 'utm_*/fbclid etc. Strip before sharing.' });

  for (const s of scripts) {
    findings.push({ severity: 'high', title: 'Script tag', detail: 'Markdown should not contain <script> — possible injection.', evidence: s.outerHTML.slice(0, 200) });
  }

  // raw html iframe
  if (md.toLowerCase().includes('<iframe')) findings.push({ severity: 'high', title: 'Inline iframe', detail: 'Markdown contains <iframe> — can load third-party content.' });
  if (md.includes('<script')) findings.push({ severity: 'high', title: 'Inline script', detail: 'Raw <script> in Markdown.' });

  if (findings.length === 0) findings.push({ severity: 'info', title: 'No trackers detected', detail: 'No external images, tracking params, or suspicious HTML found.' });

  return { htmlPreview: html, findings };
}
