import {secureRandomInt} from './random.ts';

export type IdentityLocale = 'br' | 'us' | 'intl';

export interface FakeIdentity {
  fullName: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  phone: string;
  dateOfBirth: string;
  address: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  document: string;
  documentType: string;
  uuid: string;
  ipv4: string;
}

const FIRST_BR = [
  'Ana', 'Beatriz', 'Bruno', 'Camila', 'Carlos', 'Daniel', 'Eduardo', 'Fernanda',
  'Gabriel', 'Helena', 'Igor', 'Juliana', 'Lucas', 'Mariana', 'Mateus', 'Natália',
  'Otávio', 'Patrícia', 'Rafael', 'Sofia', 'Thiago', 'Vanessa', 'Vinícius', 'Yasmin',
];
const LAST_BR = [
  'Almeida', 'Alves', 'Araujo', 'Barbosa', 'Cardoso', 'Carvalho', 'Costa', 'Dias',
  'Fernandes', 'Ferreira', 'Gomes', 'Lima', 'Martins', 'Mendes', 'Oliveira', 'Pereira',
  'Ribeiro', 'Rocha', 'Santos', 'Silva', 'Souza', 'Teixeira',
];
const CITIES_BR: {city: string; region: string; prefix: string}[] = [
  {city: 'São Paulo', region: 'SP', prefix: '011'},
  {city: 'Rio de Janeiro', region: 'RJ', prefix: '021'},
  {city: 'Belo Horizonte', region: 'MG', prefix: '031'},
  {city: 'Porto Alegre', region: 'RS', prefix: '051'},
  {city: 'Curitiba', region: 'PR', prefix: '041'},
  {city: 'Salvador', region: 'BA', prefix: '071'},
  {city: 'Recife', region: 'PE', prefix: '081'},
  {city: 'Brasília', region: 'DF', prefix: '061'},
  {city: 'Fortaleza', region: 'CE', prefix: '085'},
  {city: 'Manaus', region: 'AM', prefix: '092'},
];
const STREETS_BR = [
  'Rua das Acácias', 'Av. Atlântica', 'Rua do Comércio', 'Av. Brasil',
  'Rua das Laranjeiras', 'Travessa do Sol', 'Alameda Santos', 'Rua Augusta',
];

const FIRST_US = [
  'Alex', 'Avery', 'Blake', 'Cameron', 'Casey', 'Drew', 'Ellis', 'Finley',
  'Harper', 'Jordan', 'Kai', 'Logan', 'Morgan', 'Parker', 'Quinn', 'Riley',
  'Rowan', 'Sage', 'Taylor', 'Reese',
];
const LAST_US = [
  'Adler', 'Bennett', 'Carter', 'Dawson', 'Ellis', 'Foster', 'Hayes', 'Keller',
  'Morgan', 'Parker', 'Reed', 'Sullivan', 'Turner', 'Walsh', 'Young',
];
const CITIES_US: {city: string; region: string}[] = [
  {city: 'Austin', region: 'TX'},
  {city: 'Denver', region: 'CO'},
  {city: 'Portland', region: 'OR'},
  {city: 'Seattle', region: 'WA'},
  {city: 'Chicago', region: 'IL'},
  {city: 'Boston', region: 'MA'},
  {city: 'Atlanta', region: 'GA'},
  {city: 'Minneapolis', region: 'MN'},
];
const STREETS_US = [
  'Oak Street', 'Maple Avenue', 'Cedar Lane', 'Pine Road', 'Lakeview Drive',
  'Hillcrest Way', 'Sunset Boulevard', 'River Road',
];

const FIRST_INTL = [...FIRST_BR.slice(0, 8), ...FIRST_US.slice(0, 8), 'Amir', 'Noor', 'Ines', 'Lars'];
const LAST_INTL = [...LAST_BR.slice(0, 6), ...LAST_US.slice(0, 6), 'Berg', 'Nielsen', 'Rossi', 'Dupont'];
const CITIES_INTL: {city: string; region: string; country: string}[] = [
  {city: 'Lisbon', region: 'Lisboa', country: 'Portugal'},
  {city: 'Berlin', region: 'BE', country: 'Germany'},
  {city: 'Toronto', region: 'ON', country: 'Canada'},
  {city: 'Mexico City', region: 'CDMX', country: 'Mexico'},
  {city: 'Buenos Aires', region: 'CABA', country: 'Argentina'},
  {city: 'Tokyo', region: 'Tokyo', country: 'Japan'},
];

function pick<T>(list: readonly T[]): T {
  return list[secureRandomInt(list.length)];
}

function digits(count: number): number[] {
  return Array.from({length: count}, () => secureRandomInt(10));
}

function formatDigits(values: number[], pattern: string): string {
  let i = 0;
  return pattern.replace(/#/g, () => String(values[i++]));
}

export function cpfCheckDigits(body: number[]): [number, number] {
  if (body.length !== 9) throw new Error('CPF body must have 9 digits');
  let s1 = 0;
  for (let i = 0; i < 9; i++) s1 += body[i] * (10 - i);
  const d1 = s1 % 11 < 2 ? 0 : 11 - (s1 % 11);
  let s2 = 0;
  for (let i = 0; i < 9; i++) s2 += body[i] * (11 - i);
  s2 += d1 * 2;
  const d2 = s2 % 11 < 2 ? 0 : 11 - (s2 % 11);
  return [d1, d2];
}

export function generateCpf(formatted = true): string {
  let body = digits(9);
  if (body.every(d => d === body[0])) body = [1, ...digits(8)];
  const [d1, d2] = cpfCheckDigits(body);
  const all = [...body, d1, d2];
  return formatted ? formatDigits(all, '###.###.###-##') : all.join('');
}

export function cnpjCheckDigits(body: number[]): [number, number] {
  if (body.length !== 12) throw new Error('CNPJ body must have 12 digits');
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const d1raw = body.reduce((sum, d, i) => sum + d * w1[i], 0) % 11;
  const d1 = d1raw < 2 ? 0 : 11 - d1raw;
  const withD1 = [...body, d1];
  const d2raw = withD1.reduce((sum, d, i) => sum + d * w2[i], 0) % 11;
  const d2 = d2raw < 2 ? 0 : 11 - d2raw;
  return [d1, d2];
}

export function generateCnpj(formatted = true): string {
  const body = [...digits(8), 0, 0, 0, 1];
  const [d1, d2] = cnpjCheckDigits(body);
  const all = [...body, d1, d2];
  return formatted ? formatDigits(all, '##.###.###/####-##') : all.join('');
}

export function generateSsn(): string {
  const area = 100 + secureRandomInt(800);
  const group = 1 + secureRandomInt(99);
  const serial = 1 + secureRandomInt(9999);
  return `${String(area).padStart(3, '0')}-${String(group).padStart(2, '0')}-${String(serial).padStart(4, '0')}`;
}

function slug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function randomDateOfBirth(): string {
  const year = 1968 + secureRandomInt(35);
  const month = 1 + secureRandomInt(12);
  const day = 1 + secureRandomInt(28);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function randomIpv4(): string {
  return `203.0.113.${1 + secureRandomInt(253)}`;
}

function randomUuid(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function generateIdentity(locale: IdentityLocale = 'br'): FakeIdentity {
  if (locale === 'br') {
    const firstName = pick(FIRST_BR);
    const lastName = pick(LAST_BR);
    const place = pick(CITIES_BR);
    const number = 10 + secureRandomInt(2400);
    const mobile = `${2 + secureRandomInt(8)}${[...Array(8)].map(() => secureRandomInt(10)).join('')}`;
    const emailLocal = `${slug(firstName)}.${slug(lastName)}${secureRandomInt(90)}`;
    return {
      fullName: `${firstName} ${lastName}`,
      firstName,
      lastName,
      email: `${emailLocal}@example.test`,
      username: `${slug(firstName)}${slug(lastName).slice(0, 4)}${secureRandomInt(90)}`,
      phone: `+55 ${place.prefix.slice(1)} 9${mobile.slice(0, 4)}-${mobile.slice(4)}`,
      dateOfBirth: randomDateOfBirth(),
      address: `${pick(STREETS_BR)}, ${number}`,
      city: place.city,
      region: place.region,
      postalCode: `${10000 + secureRandomInt(89999)}-${String(secureRandomInt(1000)).padStart(3, '0')}`,
      country: 'Brazil',
      document: generateCpf(),
      documentType: 'CPF',
      uuid: randomUuid(),
      ipv4: randomIpv4(),
    };
  }

  if (locale === 'us') {
    const firstName = pick(FIRST_US);
    const lastName = pick(LAST_US);
    const place = pick(CITIES_US);
    const number = 10 + secureRandomInt(8900);
    const emailLocal = `${slug(firstName)}.${slug(lastName)}${secureRandomInt(90)}`;
    return {
      fullName: `${firstName} ${lastName}`,
      firstName,
      lastName,
      email: `${emailLocal}@example.test`,
      username: `${slug(firstName)}${secureRandomInt(900) + 10}`,
      phone: `+1 (${200 + secureRandomInt(700)}) ${200 + secureRandomInt(700)}-${1000 + secureRandomInt(9000)}`,
      dateOfBirth: randomDateOfBirth(),
      address: `${number} ${pick(STREETS_US)}`,
      city: place.city,
      region: place.region,
      postalCode: String(10000 + secureRandomInt(89999)),
      country: 'United States',
      document: generateSsn(),
      documentType: 'SSN',
      uuid: randomUuid(),
      ipv4: randomIpv4(),
    };
  }

  const firstName = pick(FIRST_INTL);
  const lastName = pick(LAST_INTL);
  const place = pick(CITIES_INTL);
  const number = 10 + secureRandomInt(180);
  const emailLocal = `${slug(firstName)}.${slug(lastName)}${secureRandomInt(90)}`;
  return {
    fullName: `${firstName} ${lastName}`,
    firstName,
    lastName,
    email: `${emailLocal}@example.test`,
    username: `${slug(firstName)[0]}${slug(lastName)}${secureRandomInt(90)}`,
    phone: `+${10 + secureRandomInt(80)} ${200 + secureRandomInt(700)} ${100000 + secureRandomInt(899999)}`,
    dateOfBirth: randomDateOfBirth(),
    address: `${pick(STREETS_US)}, ${number}`,
    city: place.city,
    region: place.region,
    postalCode: String(1000 + secureRandomInt(8999)),
    country: place.country,
    document: `ID-${(1_000_000 + secureRandomInt(8_999_999)).toString(16).toUpperCase()}`,
    documentType: 'ID',
    uuid: randomUuid(),
    ipv4: randomIpv4(),
  };
}

export function generateIdentities(count: number, locale: IdentityLocale = 'br'): FakeIdentity[] {
  const n = Math.max(1, Math.min(50, Math.floor(count)));
  return Array.from({length: n}, () => generateIdentity(locale));
}

export function identitiesToCsv(rows: FakeIdentity[]): string {
  const headers: (keyof FakeIdentity)[] = [
    'fullName',
    'firstName',
    'lastName',
    'email',
    'username',
    'phone',
    'dateOfBirth',
    'address',
    'city',
    'region',
    'postalCode',
    'country',
    'documentType',
    'document',
    'uuid',
    'ipv4',
  ];
  const escape = (value: string) => {
    if (/[",\n]/.test(value)) return `"${value.replaceAll('"', '""')}"`;
    return value;
  };
  return [headers.join(','), ...rows.map(row => headers.map(key => escape(row[key])).join(','))].join('\n');
}
