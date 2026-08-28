import { bytesToBase64 } from './bytes';

export type SriAlgorithm = 'SHA-256' | 'SHA-384' | 'SHA-512';

export interface SriResult {
  algorithm: SriAlgorithm;
  base64: string;
  integrity: string;
  hex: string;
}

function toHex(bytes: Uint8Array): string {
  return [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function computeSri(data: ArrayBuffer, algorithm: SriAlgorithm): Promise<SriResult> {
  const digest = new Uint8Array(await crypto.subtle.digest(algorithm, data));
  const base64 = bytesToBase64(digest);
  const algoToken = algorithm.toLowerCase().replace('-', '');
  return {
    algorithm,
    base64,
    integrity: `${algoToken}-${base64}`,
    hex: toHex(digest),
  };
}

export async function computeAllSri(data: ArrayBuffer): Promise<Record<SriAlgorithm, SriResult>> {
  const algos: SriAlgorithm[] = ['SHA-256', 'SHA-384', 'SHA-512'];
  const out = {} as Record<SriAlgorithm, SriResult>;
  for (const a of algos) out[a] = await computeSri(data, a);
  return out;
}

export function buildTag(url: string, integrity: string, isStylesheet = false): string {
  const tag = isStylesheet
    ? `<link rel="stylesheet" href="${url}" integrity="${integrity}" crossorigin="anonymous">`
    : `<script src="${url}" integrity="${integrity}" crossorigin="anonymous"></script>`;
  return tag;
}
