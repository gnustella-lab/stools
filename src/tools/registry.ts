import {lazy} from 'react';
import {
  KeyIcon,
  FingerPrintIcon,
  IdentificationIcon,
  TicketIcon,
  CodeBracketIcon,
  LinkIcon,
  CodeBracketSquareIcon,
  ClockIcon,
  SwatchIcon,
  DocumentMagnifyingGlassIcon,
  LanguageIcon,
  PhotoIcon,
  LockClosedIcon,
  ShieldExclamationIcon,
  EyeSlashIcon,
  TrashIcon,
  LinkSlashIcon,
  CursorArrowRaysIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline';
import type {ToolDef, ToolCategory} from './types';

export const CATEGORY_ORDER: ToolCategory[] = [
  'Security',
  'Encoding',
  'Data',
  'Media',
  'Text',
];

export const TOOLS: ToolDef[] = [
  {
    id: 'password-generator',
    name: 'Password Generator',
    tagline: 'Strong random passwords and passphrases',
    description:
      'Generate cryptographically secure passwords and diceware-style passphrases using your operating system randomness.',
    category: 'Security',
    icon: KeyIcon,
    keywords: ['password', 'passphrase', 'random', 'entropy', 'diceware'],
    component: lazy(() => import('./PasswordGenerator')),
  },
  {
    id: 'hash-calculator',
    name: 'Hash Calculator',
    tagline: 'SHA family digests for text and files',
    description:
      'Compute SHA-1, SHA-256, SHA-384 and SHA-512 digests of text or local files to verify integrity without uploading anything.',
    category: 'Security',
    icon: FingerPrintIcon,
    keywords: ['hash', 'sha256', 'sha1', 'checksum', 'digest', 'verify'],
    component: lazy(() => import('./HashCalculator')),
  },
  {
    id: 'uuid-generator',
    name: 'UUID Generator',
    tagline: 'Bulk RFC 4122 v4 identifiers',
    description:
      'Create random version-4 UUIDs in bulk with optional formatting variants for logs, fixtures and databases.',
    category: 'Security',
    icon: IdentificationIcon,
    keywords: ['uuid', 'guid', 'identifier', 'random'],
    component: lazy(() => import('./UuidGenerator')),
  },
  {
    id: 'jwt-decoder',
    name: 'JWT Decoder',
    tagline: 'Inspect token header and claims',
    description:
      'Decode JSON Web Tokens to inspect the algorithm and payload claims. Decoding happens locally — signature is never verified against a server.',
    category: 'Security',
    icon: TicketIcon,
    keywords: ['jwt', 'token', 'auth', 'claims', 'decode'],
    component: lazy(() => import('./JwtDecoder')),
  },
  {
    id: 'aes-crypt',
    name: 'AES Encrypt / Decrypt',
    tagline: 'Seal text and files with AES-GCM',
    description:
      'Encrypt and decrypt text or local files with a passphrase. Keys are derived in-browser with PBKDF2 and AES-256-GCM — the plaintext never leaves this tab.',
    category: 'Security',
    icon: LockClosedIcon,
    keywords: ['aes', 'encrypt', 'decrypt', 'gcm', 'password', 'cipher', 'seal'],
    component: lazy(() => import('./AesCrypt')),
  },
  {
    id: 'hmac-calculator',
    name: 'HMAC Calculator',
    tagline: 'Authenticate messages with a secret',
    description:
      'Compute HMAC-SHA-256, SHA-384 or SHA-512 of text or a local file using a secret that never leaves this device.',
    category: 'Security',
    icon: ShieldExclamationIcon,
    keywords: ['hmac', 'mac', 'sha256', 'authenticate', 'integrity'],
    component: lazy(() => import('./HmacCalculator')),
  },
  {
    id: 'base64-codec',
    name: 'Base64 Encoder / Decoder',
    tagline: 'UTF-8 safe Base64 in both directions',
    description:
      'Encode text to Base64 or decode Base64 back to text with full Unicode support, entirely offline.',
    category: 'Encoding',
    icon: CodeBracketIcon,
    keywords: ['base64', 'encode', 'decode', 'btoa', 'atob'],
    component: lazy(() => import('./Base64Codec')),
  },
  {
    id: 'url-codec',
    name: 'URL Encoder / Decoder',
    tagline: 'Percent-encoding for components and URIs',
    description:
      'Escape reserved characters for URLs or decode percent-encoded strings, choosing between component and full URI rules.',
    category: 'Encoding',
    icon: LinkIcon,
    keywords: ['url', 'uri', 'percent', 'escape', 'query'],
    component: lazy(() => import('./UrlCodec')),
  },
  {
    id: 'json-formatter',
    name: 'JSON Formatter',
    tagline: 'Validate, prettify and minify',
    description:
      'Format, minify and validate JSON with precise error reporting. Your data is parsed in memory only.',
    category: 'Data',
    icon: CodeBracketSquareIcon,
    keywords: ['json', 'format', 'pretty', 'minify', 'validate', 'lint'],
    component: lazy(() => import('./JsonFormatter')),
  },
  {
    id: 'timestamp-converter',
    name: 'Timestamp Converter',
    tagline: 'Unix epoch ⇄ human readable dates',
    description:
      'Convert Unix timestamps (seconds or milliseconds) to ISO 8601, UTC and locale strings — and back.',
    category: 'Data',
    icon: ClockIcon,
    keywords: ['unix', 'epoch', 'timestamp', 'date', 'time', 'iso'],
    component: lazy(() => import('./TimestampConverter')),
  },
  {
    id: 'color-converter',
    name: 'Color Converter',
    tagline: 'HEX, RGB and HSL conversions',
    description:
      'Convert colors between HEX, RGB and HSL notations with a live preview and copyable CSS values.',
    category: 'Data',
    icon: SwatchIcon,
    keywords: ['color', 'hex', 'rgb', 'hsl', 'css'],
    component: lazy(() => import('./ColorConverter')),
  },
  {
    id: 'image-metadata-inspector',
    name: 'Image Metadata Inspector',
    tagline: 'Reveal EXIF before you share',
    description:
      'Inspect JPEG metadata — EXIF, GPS coordinates and camera details — locally, so you know exactly what a photo leaks before posting it.',
    category: 'Media',
    icon: PhotoIcon,
    keywords: ['exif', 'metadata', 'jpeg', 'jpg', 'gps', 'photo', 'privacy'],
    component: lazy(() => import('./ImageMetadataInspector')),
  },
  {
    id: 'metadata-remover',
    name: 'Metadata Remover',
    tagline: 'Strip EXIF from images and MP4/MOV metadata',
    description:
      'Remove EXIF, GPS coordinates and camera tags from images, or drop metadata boxes from MP4, M4V and MOV videos — all locally, with no upload.',
    category: 'Media',
    icon: TrashIcon,
    keywords: ['exif', 'metadata', 'remove', 'strip', 'gps', 'mp4', 'mov', 'video', 'privacy', 'clean'],
    component: lazy(() => import('./MetadataRemover')),
  },
  {
    id: 'image-pixelator',
    name: 'Image Pixelator',
    tagline: 'Mosaic faces and secrets before sharing',
    description:
      'Draw a box over faces, plates or tokens and download a censored copy. The region becomes solid mosaic blocks with no blur for software to reverse.',
    category: 'Media',
    icon: Squares2X2Icon,
    keywords: ['pixelate', 'mosaic', 'censor', 'blur', 'redact', 'face', 'screenshot', 'privacy'],
    component: lazy(() => import('./ImagePixelator')),
  },
  {
    id: 'totp-generator',
    name: 'TOTP Generator',
    tagline: 'Offline 2FA codes without a synced app',
    description:
      'Generate RFC 6238 time-based one-time passwords from an otpauth:// URI or Base32 secret. Codes are derived locally with Web Crypto — the secret never reaches a server.',
    category: 'Security',
    icon: CursorArrowRaysIcon,
    keywords: ['totp', '2fa', 'mfa', 'otp', 'authenticator', 'one-time password', 'rfc6238', 'privacy'],
    component: lazy(() => import('./TotpGenerator')),
  },
  {
    id: 'link-cleaner',
    name: 'Link Cleaner',
    tagline: 'Strip tracking parameters before sharing URLs',
    description:
      'Remove utm_*, fbclid, gclid and dozens of other click-identifiers from links. Paste one URL or a batch; cleaned links are rebuilt in your browser.',
    category: 'Security',
    icon: LinkSlashIcon,
    keywords: ['url', 'tracking', 'utm', 'fbclid', 'gclid', 'clean', 'share', 'privacy'],
    component: lazy(() => import('./LinkCleaner')),
  },
  {
    id: 'fingerprint-panel',
    name: 'Browser Fingerprint Panel',
    tagline: 'See what your browser reveals about you',
    description:
      'Inspect the canvas, WebGL, audio, hardware and preference signals that fingerprinting scripts read. A local mirror only — nothing is reported anywhere.',
    category: 'Security',
    icon: EyeSlashIcon,
    keywords: ['fingerprint', 'canvas', 'webgl', 'audio', 'tracking', 'browser', 'entropy', 'privacy'],
    component: lazy(() => import('./FingerprintPanel')),
  },
  {
    id: 'text-diff',
    name: 'Text Diff',
    tagline: 'Compare two texts line by line',
    description:
      'Spot added, removed and unchanged lines between two versions of a text using a classic longest-common-subsequence diff.',
    category: 'Text',
    icon: DocumentMagnifyingGlassIcon,
    keywords: ['diff', 'compare', 'changes', 'text'],
    component: lazy(() => import('./TextDiff')),
  },
  {
    id: 'case-converter',
    name: 'Case Converter',
    tagline: 'camelCase, snake_case, kebab and more',
    description:
      'Convert text between camelCase, PascalCase, snake_case, kebab-case, CONSTANT_CASE, Title Case and sentence case.',
    category: 'Text',
    icon: LanguageIcon,
    keywords: ['case', 'camel', 'snake', 'kebab', 'pascal', 'title'],
    component: lazy(() => import('./CaseConverter')),
  },
  {
    id: 'secret-redactor',
    name: 'Secret Redactor',
    tagline: 'Mask emails, tokens and keys before you share',
    description:
      'Replace emails, phone numbers, JWTs, API tokens, card numbers and private keys in text so you can paste logs or tickets without leaking secrets.',
    category: 'Text',
    icon: EyeSlashIcon,
    keywords: ['redact', 'pii', 'email', 'token', 'secret', 'sanitize', 'mask'],
    component: lazy(() => import('./SecretRedactor')),
  },
];

export function findTool(id: string): ToolDef | undefined {
  return TOOLS.find(tool => tool.id === id);
}
