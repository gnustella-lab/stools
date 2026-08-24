export type Severity = 'high' | 'medium' | 'low' | 'info';

export interface TrackerFinding {
  severity: Severity;
  title: string;
  detail: string;
  evidence?: string;
  count?: number;
}

export interface TrackerReport {
  findings: TrackerFinding[];
  stats: {
    images: number;
    scripts: number;
    iframes: number;
    links: number;
    pixels: number;
  };
  cleanedHtml?: string;
}

const TRACKER_DOMAINS = [
  'doubleclick.net',
  'googletagmanager.com',
  'googletagservices.com',
  'google-analytics.com',
  'googletag',
  'facebook.net',
  'connect.facebook.net',
  'facebook.com/tr',
  'hotjar',
  'mixpanel',
  'segment.com',
  'segment.io',
  'amplitude',
  'clarity.ms',
  'taboola',
  'outbrain',
  'scorecardresearch',
  'criteo',
  'googlesyndication',
];

const FINGERPRINT_HINTS = ['fingerprint', 'canvas', 'webgl', 'audioContext', 'navigator.'];

function isTrackerUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return TRACKER_DOMAINS.some(d => lower.includes(d));
}

export function inspectHtml(html: string): TrackerReport {
  const trimmed = html.trim();
  if (!trimmed) throw new Error('Paste HTML to inspect.');
  const parser = new DOMParser();
  const doc = parser.parseFromString(trimmed, 'text/html');

  const findings: TrackerFinding[] = [];

  const images = [...doc.querySelectorAll('img')];
  const scripts = [...doc.querySelectorAll('script')];
  const iframes = [...doc.querySelectorAll('iframe')];
  const links = [...doc.querySelectorAll('a')];
  const pixels: Element[] = [];

  for (const img of images) {
    const w = img.getAttribute('width');
    const h = img.getAttribute('height');
    const style = img.getAttribute('style') ?? '';
    const src = img.getAttribute('src') ?? '';
    const isTiny = w === '1' || h === '1' || /width\s*:\s*1px/.test(style) || /height\s*:\s*1px/.test(style);
    const isTracker = isTrackerUrl(src) || TRACKER_DOMAINS.some(d => src.toLowerCase().includes(d.split('.')[0]));
    if (isTiny) pixels.push(img);
    if (isTiny) {
      findings.push({
        severity: 'high',
        title: 'Tracking pixel (1×1 image)',
        detail: 'Invisible 1×1 image used to confirm opens and leak IP/time. Block or remove before sharing.',
        evidence: img.outerHTML.slice(0, 250),
      });
    } else if (isTracker) {
      findings.push({
        severity: 'medium',
        title: 'Tracker image',
        detail: `Image loads from a known tracking domain: ${src.slice(0, 80)}`,
        evidence: src.slice(0, 200),
      });
    }
    const srcLower = src.toLowerCase();
    if (srcLower.includes('pixel') || srcLower.includes('beacon') || srcLower.includes('track')) {
      if (!isTiny) {
        findings.push({
          severity: 'medium',
          title: 'Suspicious image URL',
          detail: 'Image URL contains pixel/beacon/track - likely a tracker.',
          evidence: src.slice(0, 200),
        });
      }
    }
  }

  for (const script of scripts) {
    const src = script.getAttribute('src') ?? '';
    const content = script.textContent ?? '';
    const isExternal = Boolean(src);
    if (src && isTrackerUrl(src)) {
      findings.push({
        severity: 'high',
        title: 'Third-party tracker script',
        detail: `External script from tracking domain will run fingerprinting/analytics in your page.`,
        evidence: src.slice(0, 250),
      });
    } else if (!src && FINGERPRINT_HINTS.some(h => content.toLowerCase().includes(h))) {
      findings.push({
        severity: 'high',
        title: 'Inline fingerprinting script',
        detail: 'Inline script references fingerprinting APIs (canvas/webgl/audioContext).',
        evidence: content.slice(0, 250),
      });
    } else if (isExternal && !src.startsWith('data:')) {
      findings.push({
        severity: 'low',
        title: 'External script',
        detail: 'External script - verify the domain is expected before allowing execution.',
        evidence: src.slice(0, 250),
      });
    }
  }

  for (const iframe of iframes) {
    const src = iframe.getAttribute('src') ?? '';
    const style = iframe.getAttribute('style') ?? '';
    const hidden = /display\s*:\s*none|visibility\s*:\s*hidden|width\s*:\s*0|height\s*:\s*0/.test(style) || iframe.getAttribute('width') === '0';
    if (hidden || isTrackerUrl(src)) {
      findings.push({
        severity: 'medium',
        title: hidden ? 'Hidden iframe' : 'Tracker iframe',
        detail: hidden
          ? 'Hidden iframe often used to load trackers without visible content.'
          : `Iframe from tracking domain: ${src.slice(0, 80)}`,
        evidence: iframe.outerHTML.slice(0, 250),
      });
    }
  }

  // Links with tracking params
  let trackingLinks = 0;
  for (const a of links) {
    const href = a.getAttribute('href') ?? '';
    if (!href) continue;
    try {
      const url = new URL(href, 'http://example.invalid');
      let hasTracking = false;
      for (const key of url.searchParams.keys()) {
        const lower = key.toLowerCase();
        if (lower.startsWith('utm_') || ['fbclid', 'gclid', 'msclkid', 'ttclid', 'fbp', 'wbraid', 'gbraid', 'yclid', 'dclid'].includes(lower)) {
          hasTracking = true;
          break;
        }
      }
      if (hasTracking) trackingLinks++;
      if (isTrackerUrl(href)) {
        findings.push({
          severity: 'medium',
          title: 'Link to tracker domain',
          detail: 'Link points to a known ad/tracking domain.',
          evidence: href.slice(0, 200),
        });
      }
    } catch {
      // ignore
    }
  }
  if (trackingLinks > 0) {
    findings.push({
      severity: 'medium',
      title: `${trackingLinks} link(s) with tracking parameters`,
      detail: 'Links contain utm_*, fbclid, gclid, etc. Strip them with Link Cleaner before sharing.',
      count: trackingLinks,
    });
  }

  // Meta refresh or beacon
  const metas = [...doc.querySelectorAll('meta[http-equiv]')];
  for (const meta of metas) {
    const equiv = meta.getAttribute('http-equiv')?.toLowerCase();
    if (equiv === 'refresh') {
      findings.push({
        severity: 'medium',
        title: 'Meta refresh redirect',
        detail: 'Page auto-redirects via meta refresh - can be used to bounce through a tracker.',
        evidence: meta.outerHTML.slice(0, 250),
      });
    }
  }

  const beacons = doc.querySelectorAll('link[rel="preconnect"], link[rel="dns-prefetch"], img[loading="eager"]');
  if (beacons.length > 5) {
    findings.push({
      severity: 'low',
      title: 'Many preconnect/dns-prefetch hints',
      detail: `${beacons.length} preconnect hints - may indicate excessive third-party connections.`,
    });
  }

  if (findings.length === 0) {
    findings.push({
      severity: 'info',
      title: 'No obvious trackers detected',
      detail: 'No 1×1 pixels, tracker scripts or suspicious iframes found with current heuristics. Manual review still recommended.',
    });
  }

  return {
    findings,
    stats: {
      images: images.length,
      scripts: scripts.length,
      iframes: iframes.length,
      links: links.length,
      pixels: pixels.length,
    },
  };
}

export function sanitizeHtml(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  // remove tracking pixels and scripts from tracker domains
  for (const img of [...doc.querySelectorAll('img')]) {
    const w = img.getAttribute('width');
    const h = img.getAttribute('height');
    const style = img.getAttribute('style') ?? '';
    const isTiny = w === '1' || h === '1' || /1px/.test(style);
    if (isTiny) img.remove();
  }
  for (const script of [...doc.querySelectorAll('script')]) {
    const src = script.getAttribute('src') ?? '';
    if (isTrackerUrl(src)) script.remove();
  }
  for (const a of [...doc.querySelectorAll('a')]) {
    const href = a.getAttribute('href');
    if (!href) continue;
    try {
      const url = new URL(href, 'http://example.invalid');
      const toDelete: string[] = [];
      for (const key of url.searchParams.keys()) {
        const lower = key.toLowerCase();
        if (lower.startsWith('utm_') || ['fbclid', 'gclid', 'msclkid', 'igshid', 'ttclid', 'wbraid', 'gbraid', 'yclid', 'dclid', '_hsenc', '_hsmi'].includes(lower)) {
          toDelete.push(key);
        }
      }
      for (const k of toDelete) url.searchParams.delete(k);
      if (toDelete.length > 0) {
        const rebuilt = url.pathname + (url.search ? url.search : '') + url.hash;
        const isAbsolute = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(href);
        a.setAttribute('href', isAbsolute ? url.toString() : rebuilt);
      }
    } catch {
      // ignore
    }
  }
  return doc.documentElement.outerHTML;
}
