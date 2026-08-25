import {cleanLink, LINK_RULES} from '../src/lib/linkclean.ts';

const groups = new Set(LINK_RULES.map(r => r.id));
const r1 = cleanLink('https://exemplo.com/pag?utm_source=news&utm_medium=email&id=42', groups);
console.log('1:', r1.url, '| removidos:', r1.removedParams.join(','));
const r2 = cleanLink('https://site.org/watch?v=abc&fbclid=IwAR123&t=30', groups);
console.log('2:', r2.url, '| removidos:', r2.removedParams.join(','));

if (r1.url !== 'https://exemplo.com/pag?id=42') throw new Error('caso 1 falhou');
if (r2.url !== 'https://site.org/watch?v=abc&t=30') throw new Error('caso 2 falhou');

try {
  cleanLink('nao-e-url', groups);
  console.log('ERRO: URL inválida deveria ter sido rejeitada');
  process.exit(1);
} catch {
  console.log('3: URL inválida rejeitada OK');
}
console.log('TODOS OS CASOS PASSARAM');
