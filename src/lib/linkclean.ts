// URL tracking-parameter stripping - parsed and rebuilt locally.

export interface LinkRule {
  id: string;
  label: string;
  description: string;
}

/**
 * Parameters that exist to identify the clicker rather than serve the page.
 * Grouped by network so the list stays auditable.
 */
const TRACKING_PARAMS: Record<string, string[]> = {
  'Click IDs (ad networks)': ['gclid', 'gbraid', 'wbraid', 'dclid', 'msclkid', 'fbclid', 'twclid', 'ttclid', 'li_fat_id', 'epik', 's_kwcid', 'yclid', 'igshid'],
  'Mail / campaign': ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id', 'utm_name', 'utm_cid', 'utm_reader', 'utm_social', 'utm_brand', 'mc_cid', 'mc_eid', '_hsenc', '_hsmi', 'vero_id', 'wickedid', 'hsCtaTracking', 'mtm_campaign', 'mtm_medium', 'mtm_source', 'pk_campaign', 'pk_kwd', 'pk_medium', 'si'],
  'Unilateral identifiers': ['ref', 'ref_src', 'ref_url', 'referrer', 'igsh', 'mibextid', 'cmpid', 'affid', 'affiliate', 'trk', 'trkInfo'],
};

export const LINK_RULES: LinkRule[] = Object.entries(TRACKING_PARAMS).map(([id, params]) => ({
  id,
  label: id,
  description: `${params.length} parameters`,
}));

const ALL_TRACKING = new Set<string>(
  Object.values(TRACKING_PARAMS).flat().map(p => p.toLowerCase()),
);

export interface CleanLinkResult {
  url: string;
  removedParams: string[];
}

export function cleanLink(input: string, enabledGroups: Set<string>): CleanLinkResult {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error('Paste a link first.');
  }
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error('This is not a valid absolute URL (include https://).');
  }

  const removedParams: string[] = [];
  for (const key of [...url.searchParams.keys()]) {
    if (!enabledGroups.has(groupOf(key))) {
      continue;
    }
    if (ALL_TRACKING.has(key.toLowerCase())) {
      url.searchParams.delete(key);
      removedParams.push(key);
    }
  }

  return {url: url.toString(), removedParams};
}

function groupOf(paramKey: string): string {
  const lower = paramKey.toLowerCase();
  for (const [group, params] of Object.entries(TRACKING_PARAMS)) {
    if (params.some(p => p.toLowerCase() === lower)) {
      return group;
    }
  }
  // Not a known tracking parameter at all.
  return '';
}
