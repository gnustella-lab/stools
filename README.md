# sTools

**Privacy-first developer tools that never leave your browser.**

sTools is a collection of everyday security, encoding and data utilities that run
entirely client-side. There is no backend, no account system, no analytics and no
telemetry: every computation happens in your tab, using standard browser APIs
(Web Crypto, Canvas, FileReader, the URL API). Open a tool, use it, close the tab.

Live site: **https://gnustella-lab.github.io/stools/**

## Why local processing matters

Conventional online tools send your data to a server: passwords, tokens, JSON
payloads and photos pass through machines you do not control, where they can be
logged, retained or breached. sTools takes the opposite approach - every
computation runs on your device. You can verify it: load the page once, disconnect
from the internet and keep using every tool while watching the Network panel stay
quiet.

## Tools

### Security

| Tool | What it does |
| --- | --- |
| **Password Generator** | Cryptographically secure passwords and diceware-style passphrases from OS randomness |
| **Password Analyzer** | Local strength estimate (length, classes, common lists, keyboard walks, 1337) - no online breach lookup |
| **Hash Calculator** | SHA-1/256/384/512 digests of text or local files for integrity checks |
| **HMAC Calculator** | HMAC-SHA-256/384/512 of text or files with a secret that never leaves the device |
| **AES Encrypt / Decrypt** | Seal text and files with AES-256-GCM after PBKDF2 (210,000 iterations) |
| **JWT Decoder** | Inspect token header and claims locally; signatures are never verified against a server |
| **UUID Generator** | Bulk RFC 4122 v4 identifiers for logs, fixtures and databases |
| **TOTP Generator** | RFC 6238 2FA codes from an `otpauth://` URI or Base32 secret, computed with Web Crypto HMAC (validated against the official RFC test vectors) |
| **Link Cleaner** | Strip `utm_*`, `fbclid`, `gclid` and 45+ other tracking parameters from links, one at a time or in bulk |
| **Homograph Detector** | Flag mixed scripts, punycode, zero-width characters and lookalike letters in URLs, emails and domains |
| **Browser Fingerprint Panel** | Mirror what any site could read right now: canvas hash, WebGL vendor/renderer, audio context, hardware, timezone and preference signals |
| **Email Privacy Inspector** | Parse raw email source for 1×1 tracking pixels, Reply-To mismatches, bulk-mail flags and link trackers |
| **Tracker Inspector** | Enumerate tracking pixels, third-party scripts, hidden iframes and `utm_*`/`fbclid` links in pasted HTML |
| **HAR Sanitizer** | Redact cookies, Authorization headers, query tokens, JWTs, PEM keys and IPs from HAR or JSON captures |
| **Paste Vault** | Seal a note with AES-256-GCM + PBKDF2 and share it as a URL fragment that never reaches a server |

### Encoding

| Tool | What it does |
| --- | --- |
| **Base64 Encoder / Decoder** | UTF-8-safe Base64 in both directions |
| **URL Encoder / Decoder** | Percent-encoding for components and full URIs |

### Data

| Tool | What it does |
| --- | --- |
| **JSON Formatter** | Validate, prettify and minify JSON with precise error reporting |
| **Timestamp Converter** | Unix epoch ⇄ ISO 8601, UTC and locale strings |
| **Color Converter** | HEX ⇄ RGB ⇄ HSL with live preview |
| **CSV / JSON Anonymizer** | Pseudonymize, mask, hash or drop columns locally; the same salt keeps joins consistent |
| **Location Track Anonymizer** | Round and shift GPX / GeoJSON coordinates; drop timestamps, elevation and names before publishing |

### Media

| Tool | What it does |
| --- | --- |
| **Image Metadata Inspector** | Reveal EXIF, GPS coordinates and camera details before sharing a JPEG |
| **Metadata Remover** | Strip EXIF/GPS from images by re-encoding; drop metadata boxes (`udta`, `meta`, XMP) from MP4/MOV byte-for-byte without re-encoding |
| **Image Pixelator** | Drag-select a region and download a censored copy: solid mosaic blocks painted with `fillRect`, so no engine smoothing can soften them and no blur can be reversed |
| **QR Studio** | Generate QR codes for URLs, Wi-Fi, Pix or secrets and scan QR images with bundled jsQR - both offline |

### Text

| Tool | What it does |
| --- | --- |
| **Text Diff** | Longest-common-subsequence diff between two texts |
| **Case Converter** | camelCase, PascalCase, snake_case, kebab-case, CONSTANT_CASE, Title Case and sentence case |
| **Secret Redactor** | Mask emails, phones, JWTs, API tokens, AWS keys, card numbers and PEM keys before pasting logs into tickets |

## Privacy model

- **Nothing is uploaded.** Inputs are processed in memory and discarded when the
  tab closes. No cookies, no fingerprinting of visitors, no phoning home.
- **Works offline.** It is a static build; once loaded, you can cut the network.
- **Honest limits.** Stripping image metadata re-encodes pixels (lossy for JPEG).
  JWT decoding does not verify signatures. AES envelopes are only as strong as
  your passphrase. These are everyday privacy utilities, not forensic software.

See the in-app [privacy page](https://gnustella-lab.github.io/stools/#/privacy)
for the full model and verification steps.

## Tech stack

- [React](https://react.dev/) 19 with TypeScript (strict mode)
- [Vite](https://vite.dev/) for dev server and static build
- [Astryx Design System](https://github.com/facebook/astryx) (`@astryxdesign/core`)
  with StyleX for styling
- Heroicons for iconography
- Zero network calls at runtime: tools are lazy-loaded chunks of pure client code

## Development

```bash
npm install
npm run dev       # Vite dev server with HMR
npm run build     # tsc --noEmit + vite build (output in dist/)
npm run preview   # serve the production build locally
```

### Tests

Small script-based checks live in `scripts/` and run with Node 22's TypeScript strip-types (no extra runner):

```bash
node --experimental-strip-types scripts/test-totp.ts              # RFC 6238 Appendix B vectors
node --experimental-strip-types scripts/test-linkclean.ts         # tracking-param stripping cases
node --experimental-strip-types scripts/test-homograph.ts         # mixed-script / lookalike detection
node --experimental-strip-types scripts/test-harSanitize.ts       # HAR Authorization / token / IP redaction
node --experimental-strip-types scripts/test-passwordStrength.ts  # common vs long-random scoring
node --experimental-strip-types scripts/test-geoanonymize.ts      # GPX rounding and timestamp strip
```

## Deployment

Every push to `main` builds the site and deploys it to GitHub Pages via
`.github/workflows/deploy-pages.yml`. The site is served at
`https://gnustella-lab.github.io/stools/`.

## Contributing

New tools should follow the existing pattern: a component in `src/tools/`
registered in `src/tools/registry.ts` with id, name, tagline, description,
category, icon and keywords. Any reusable logic goes in `src/lib/` as a pure
module. Two rules keep the project honest: every tool must work offline, and no
input may ever leave the tab.

## License

[MIT](LICENSE) © gnustella-lab
