export function secureRandomInt(maxExclusive: number): number {
  if (maxExclusive <= 0 || !Number.isInteger(maxExclusive)) {
    throw new Error('maxExclusive must be a positive integer');
  }
  const limit = Math.floor(0x100000000 / maxExclusive) * maxExclusive;
  const buffer = new Uint32Array(1);
  let value = 0;
  do {
    crypto.getRandomValues(buffer);
    value = buffer[0];
  } while (value >= limit);
  return value % maxExclusive;
}

export function secureRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

export function formatEntropyBits(bits: number): string {
  return `${Math.round(bits)} bits of entropy`;
}

const WORDLIST = [
  'able', 'acorn', 'actor', 'amber', 'anchor', 'apple', 'arrow', 'atlas',
  'aurora', 'autumn', 'badge', 'bamboo', 'banjo', 'basin', 'beacon', 'bison',
  'blaze', 'bloom', 'brave', 'breeze', 'bridge', 'brook', 'cactus', 'canyon',
  'cedar', 'chalk', 'cherry', 'chime', 'cinder', 'citrus', 'clover', 'cobalt',
  'comet', 'copper', 'coral', 'cosmos', 'crane', 'creek', 'crisp', 'crystal',
  'daisy', 'delta', 'denim', 'dial', 'dolphin', 'drift', 'eagle', 'ember',
  'falcon', 'fern', 'fjord', 'flint', 'flora', 'forest', 'fossil', 'galaxy',
  'garnet', 'gecko', 'ginger', 'glacier', 'glow', 'granite', 'grove', 'harbor',
  'hazel', 'helix', 'hollow', 'horizon', 'indigo', 'ivory', 'jade', 'jasper',
  'juniper', 'kelp', 'kernel', 'lagoon', 'lantern', 'lava', 'lemon', 'lichen',
  'lilac', 'linen', 'lotus', 'lumen', 'lunar', 'mango', 'maple', 'marble',
  'meadow', 'mesa', 'mint', 'mirage', 'mosaic', 'moss', 'nebula', 'nectar',
  'oasis', 'obsidian', 'ocean', 'olive', 'onyx', 'opal', 'orbit', 'orchid',
  'otter', 'paddle', 'pebble', 'pepper', 'petal', 'pewter', 'phoenix', 'pigment',
  'pine', 'pixel', 'plateau', 'plum', 'pollen', 'prairie', 'prism', 'quartz',
  'quill', 'radish', 'rapid', 'raven', 'reef', 'ribbon', 'ridge', 'river',
  'rocket', 'rustic', 'saffron', 'sage', 'salmon', 'sandal', 'sapphire', 'scarf',
  'sequoia', 'shadow', 'shore', 'signal', 'silica', 'slate', 'solstice', 'sonnet',
  'spruce', 'starling', 'summit', 'sunset', 'syrup', 'tandem', 'tapestry', 'teak',
  'tempest', 'thicket', 'thistle', 'tide', 'timber', 'topaz', 'torch', 'trellis',
  'tulip', 'tundra', 'turquoise', 'umber', 'valley', 'velvet', 'vertex', 'vessel',
  'vineyard', 'violet', 'walnut', 'warbler', 'willow', 'window', 'winter', 'wren',
  'yarrow', 'zenith', 'zephyr',
];

export function randomWords(count: number): string[] {
  const words: string[] = [];
  for (let i = 0; i < count; i++) {
    words.push(WORDLIST[secureRandomInt(WORDLIST.length)]);
  }
  return words;
}

export function estimatePassphraseEntropy(wordCount: number): number {
  return wordCount * Math.log2(WORDLIST.length);
}
