import {secureRandomInt, secureRandomBytes} from './random';

export type PersonaLocale = 'BR' | 'US' | 'EU';

const FIRST_NAMES_BR = [
  'Alice', 'Bruno', 'Carla', 'Diego', 'Eva', 'Felipe', 'Gabi', 'Hugo', 'Iara', 'Joao',
  'Lina', 'Marcos', 'Nina', 'Oscar', 'Paula', 'Rafa', 'Sofia', 'Tiago', 'Vitor', 'Lara',
  'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery', 'Quinn',
];

const LAST_NAMES_BR = [
  'Silva', 'Santos', 'Oliveira', 'Souza', 'Lima', 'Costa', 'Pereira', 'Rodrigues', 'Almeida', 'Nascimento',
  'Araujo', 'Melo', 'Barbosa', 'Ribeiro', 'Martins', 'Carvalho', 'Lopes', 'Soares', 'Fernandes', 'Gomes',
];

const FIRST_NAMES_US = [
  'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth',
  'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen',
  'Christopher', 'Nancy', 'Daniel', 'Lisa', 'Matthew', 'Betty', 'Anthony', 'Sandra', 'Mark', 'Ashley',
  'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery', 'Quinn',
];

const LAST_NAMES_US = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Lopez', 'Wilson',
  'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White', 'Harris',
];

const FIRST_NAMES_EU = [
  'Pierre', 'Marie', 'Hans', 'Greta', 'Sofia', 'Marco', 'Joao', 'Ana', 'Jean', 'Luc',
  'Emma', 'Lucas', 'Noah', 'Mia', 'Leo', 'Lena', 'Hugo', 'Alicia', 'Luca', 'Giulia',
  'Miguel', 'Laura', 'Oscar', 'Paula', 'Eva', 'Diego', 'Nina', 'Oscar', 'Alex', 'Sage',
];

const LAST_NAMES_EU = [
  'Muller', 'Schmidt', 'Dubois', 'Martin', 'Garcia', 'Rossi', 'Silva', 'Smith', 'Jansen', 'Peeters',
  'Bernard', 'Moreau', 'Lopes', 'Fernandez', 'Esposito', 'Fischer', 'Weber', 'Lefevre', 'Costa', 'Santos',
];

const CITIES_BR = [
  {city: 'São Paulo', state: 'SP', zipPrefix: '01'},
  {city: 'Rio de Janeiro', state: 'RJ', zipPrefix: '20'},
  {city: 'Belo Horizonte', state: 'MG', zipPrefix: '30'},
  {city: 'Porto Alegre', state: 'RS', zipPrefix: '90'},
  {city: 'Curitiba', state: 'PR', zipPrefix: '80'},
  {city: 'Salvador', state: 'BA', zipPrefix: '40'},
  {city: 'Recife', state: 'PE', zipPrefix: '50'},
  {city: 'Brasília', state: 'DF', zipPrefix: '70'},
  {city: 'Fortaleza', state: 'CE', zipPrefix: '60'},
  {city: 'Florianópolis', state: 'SC', zipPrefix: '88'},
];

const CITIES_US = [
  {city: 'New York', state: 'NY', zipPrefix: '100'},
  {city: 'Los Angeles', state: 'CA', zipPrefix: '900'},
  {city: 'Chicago', state: 'IL', zipPrefix: '606'},
  {city: 'Houston', state: 'TX', zipPrefix: '770'},
  {city: 'Miami', state: 'FL', zipPrefix: '331'},
  {city: 'Seattle', state: 'WA', zipPrefix: '981'},
  {city: 'Boston', state: 'MA', zipPrefix: '021'},
  {city: 'San Francisco', state: 'CA', zipPrefix: '941'},
  {city: 'Austin', state: 'TX', zipPrefix: '733'},
  {city: 'Denver', state: 'CO', zipPrefix: '802'},
];

const CITIES_EU = [
  {city: 'Berlin', state: 'DE', country: 'DE', zipPrefix: '10115'},
  {city: 'Munich', state: 'DE', country: 'DE', zipPrefix: '80331'},
  {city: 'Paris', state: 'FR', country: 'FR', zipPrefix: '75001'},
  {city: 'Lyon', state: 'FR', country: 'FR', zipPrefix: '69001'},
  {city: 'Madrid', state: 'ES', country: 'ES', zipPrefix: '28001'},
  {city: 'Barcelona', state: 'ES', country: 'ES', zipPrefix: '08001'},
  {city: 'Rome', state: 'IT', country: 'IT', zipPrefix: '00118'},
  {city: 'Milan', state: 'IT', country: 'IT', zipPrefix: '20121'},
  {city: 'Lisbon', state: 'PT', country: 'PT', zipPrefix: '1000-001'},
  {city: 'London', state: 'UK', country: 'GB', zipPrefix: 'SW1A 1AA'},
  {city: 'Amsterdam', state: 'NL', country: 'NL', zipPrefix: '1012'},
  {city: 'Brussels', state: 'BE', country: 'BE', zipPrefix: '1000'},
];

const STREETS_BR = [
  'Rua das Flores', 'Av. Paulista', 'Rua Augusta', 'Alameda Santos', 'Rua Oscar Freire',
  'Av. Atlantica', 'Rua XV de Novembro', 'Av. Brasil', 'Rua da Consolacao', 'Alameda Lorena',
];

const STREETS_US = [
  'Main St', 'Broadway', '5th Avenue', 'Market St', 'Sunset Blvd', 'Michigan Ave',
  'Peachtree St', 'Congress Ave', 'Park Ave', 'Elm St',
];

const STREETS_EU = [
  'Rue de Rivoli', 'Unter den Linden', 'Gran Via', 'Via Roma', 'Avenida da Liberdade',
  'Oxford Street', 'Damrak', 'Rue Royale', 'Karlstrasse', 'Calle Mayor',
];

const DOMAINS = ['example.com', 'mail.test', 'inbox.test', 'privacy.local'];

const EU_PHONE_PREFIXES: Record<string, string> = {
  DE: '+49',
  FR: '+33',
  ES: '+34',
  IT: '+39',
  PT: '+351',
  GB: '+44',
  NL: '+31',
  BE: '+32',
};

function pick<T>(arr: T[]): T {
  return arr[secureRandomInt(arr.length)];
}

function randomDigits(count: number): string {
  const bytes = secureRandomBytes(count);
  let out = '';
  for (let i = 0; i < count; i++) out += String(bytes[i] % 10);
  return out;
}

function luhnCheckDigit(partial: string): string {
  let sum = 0;
  let doubleDigit = true;
  for (let i = partial.length - 1; i >= 0; i--) {
    let digit = Number(partial[i]);
    if (doubleDigit) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    doubleDigit = !doubleDigit;
  }
  const check = (10 - (sum % 10)) % 10;
  return String(check);
}

export function generateCpf(formatted = false): string {
  const base = randomDigits(9);
  const d1 = (() => {
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += Number(base[i]) * (10 - i);
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  })();
  const d2 = (() => {
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += Number(base[i]) * (11 - i);
    sum += d1 * 2;
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  })();
  const raw = `${base}${d1}${d2}`;
  if (!formatted) return raw;
  return `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6, 9)}-${raw.slice(9)}`;
}

export function generateCnpj(formatted = false): string {
  const base = randomDigits(8) + '0001';
  const calc = (b: string): number => {
    const weights = b.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < b.length; i++) sum += Number(b[i]) * weights[i];
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const d1 = calc(base);
  const d2 = calc(base + String(d1));
  const raw = `${base}${d1}${d2}`;
  if (!formatted) return raw;
  return `${raw.slice(0, 2)}.${raw.slice(2, 5)}.${raw.slice(5, 8)}/${raw.slice(8, 12)}-${raw.slice(12)}`;
}

export function generateSsn(formatted = true): string {
  // US SSN restrictions: area 001-899 excluding 666 and 900-999, group 01-99, serial 0001-9999
  let area: number;
  do {
    area = secureRandomInt(900) + 1;
  } while (area === 666 || area >= 900);
  const areaStr = String(area).padStart(3, '0');
  let group: number;
  do {
    group = secureRandomInt(99) + 1;
  } while (group === 0);
  const groupStr = String(group).padStart(2, '0');
  let serial: number;
  do {
    serial = secureRandomInt(9999) + 1;
  } while (serial === 0);
  const serialStr = String(serial).padStart(4, '0');
  const raw = `${areaStr}${groupStr}${serialStr}`;
  if (!formatted) return raw;
  return `${areaStr}-${groupStr}-${serialStr}`;
}

export function generatePassportNumber(): string {
  // Generic EU/US passport: 1-2 letters + 7 digits, e.g., "P1234567" or "AB1234567"
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const useTwo = secureRandomInt(2) === 0;
  const letterPart = useTwo
    ? letters[secureRandomInt(26)] + letters[secureRandomInt(26)]
    : letters[secureRandomInt(26)];
  return `${letterPart}${randomDigits(7)}`;
}

function mod97IbanCheck(country: string, bban: string): string {
  const rearranged = bban + country + '00';
  let numeric = '';
  for (const ch of rearranged) {
    if (ch >= '0' && ch <= '9') numeric += ch;
    else numeric += String(ch.charCodeAt(0) - 55);
  }
  let remainder = 0;
  for (let i = 0; i < numeric.length; i++) {
    remainder = (remainder * 10 + Number(numeric[i])) % 97;
  }
  const check = 98 - remainder;
  return String(check).padStart(2, '0');
}

export function generateIban(country?: string): string {
  const countries = country
    ? [country]
    : ['DE', 'FR', 'GB', 'ES', 'IT', 'PT', 'NL', 'BE'];
  const chosen = pick(countries);
  let bban = '';
  switch (chosen) {
    case 'DE':
      bban = randomDigits(8) + randomDigits(10);
      break;
    case 'FR':
      bban = randomDigits(10) + randomDigits(11) + randomDigits(2);
      break;
    case 'GB':
      bban = pick(['NWBK', 'BARC', 'LOYD', 'MIDL']) + randomDigits(6) + randomDigits(8);
      break;
    case 'ES':
      bban = randomDigits(10) + randomDigits(10);
      break;
    case 'IT':
      bban = pick(['A', 'L']) + randomDigits(10) + randomDigits(12);
      if (bban.length === 24) bban = bban.slice(0, 23);
      break;
    case 'PT':
      bban = randomDigits(21);
      break;
    case 'NL':
      bban = pick(['ABNA', 'INGB', 'RABO']) + randomDigits(10);
      break;
    case 'BE':
      bban = randomDigits(12);
      break;
    default:
      bban = randomDigits(16);
  }
  // Ensure BBAN length valid per spec: GB 18, DE 18, FR 23, ES 20, IT 23, PT 21, NL 14, BE 12
  const expected: Record<string, number> = {DE: 18, FR: 23, GB: 18, ES: 20, IT: 23, PT: 21, NL: 14, BE: 12};
  const target = expected[chosen] ?? bban.length;
  if (bban.length > target) bban = bban.slice(0, target);
  while (bban.length < target) bban += randomDigits(1);
  const check = mod97IbanCheck(chosen, bban);
  return `${chosen}${check}${bban}`;
}

export function generateNifEU(country: string): string {
  // Simplified NIF/VAT-like identifier per country
  switch (country) {
    case 'DE':
      return `DE${randomDigits(9)}`;
    case 'FR':
      return `FR${randomDigits(2)}${randomDigits(9)}`;
    case 'ES':
      return `${pick(['A','B','C'])}${randomDigits(8)}`;
    case 'IT':
      return randomDigits(11);
    case 'PT':
      return randomDigits(9);
    case 'GB':
      return `GB${randomDigits(9)}`;
    case 'NL':
      return `${randomDigits(9)}B${randomDigits(2)}`;
    case 'BE':
      return `${randomDigits(10)}`;
    default:
      return `${country}${randomDigits(8)}`;
  }
}

export function generateCreditCard(): {number: string; expiry: string; cvv: string} {
  const prefixes = ['4', '51', '52', '34'];
  const prefix = pick(prefixes);
  const length = prefix === '34' ? 15 : 16;
  const remaining = length - prefix.length - 1;
  const body = prefix + randomDigits(remaining);
  const check = luhnCheckDigit(body);
  const number = body + check;
  const mm = String(secureRandomInt(12) + 1).padStart(2, '0');
  const yy = String(secureRandomInt(5) + 27).padStart(2, '0');
  const cvv = randomDigits(prefix === '34' ? 4 : 3);
  const formatted =
    prefix === '34'
      ? `${number.slice(0, 4)} ${number.slice(4, 10)} ${number.slice(10)}`
      : `${number.slice(0, 4)} ${number.slice(4, 8)} ${number.slice(8, 12)} ${number.slice(12)}`;
  return {number: formatted, expiry: `${mm}/${yy}`, cvv};
}

export interface Persona {
  locale: PersonaLocale;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  zip: string;
  birthDate: string;
  // Brazil
  cpf: string;
  cnpj: string;
  // US
  ssn: string;
  passport: string;
  // EU
  iban: string;
  nationalId: string;
  vatId?: string;
  // common
  creditCard: string;
  creditExpiry: string;
  creditCvv: string;
  username: string;
  password: string;
}

function randomBirthDate(): string {
  const year = 1970 + secureRandomInt(35);
  const month = secureRandomInt(12) + 1;
  const day = secureRandomInt(28) + 1;
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
}

function randomPassword(): string {
  const charset = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%';
  const len = 14 + secureRandomInt(6);
  const bytes = secureRandomBytes(len);
  let out = '';
  for (let i = 0; i < len; i++) out += charset[bytes[i] % charset.length];
  return out;
}

function phoneForLocale(locale: PersonaLocale, countryCode: string): string {
  if (locale === 'BR') {
    const area = String(secureRandomInt(80) + 10);
    return `+55 ${area} 9${randomDigits(4)}-${randomDigits(4)}`;
  }
  if (locale === 'US') {
    // NANP: NXX-NXX-XXXX where N 2-9
    const areaFirst = String(secureRandomInt(8) + 2);
    const area = areaFirst + randomDigits(2);
    const exchFirst = String(secureRandomInt(8) + 2);
    const exchange = exchFirst + randomDigits(2);
    const subscriber = randomDigits(4);
    return `+1 (${area}) ${exchange}-${subscriber}`;
  }
  // EU
  const prefix = EU_PHONE_PREFIXES[countryCode] ?? '+49';
  const national = `${randomDigits(3)} ${randomDigits(4)} ${randomDigits(4)}`.trim();
  // UK formatting slightly different
  if (countryCode === 'GB') return `+44 7${randomDigits(3)} ${randomDigits(6)}`;
  return `${prefix} ${national}`;
}

export function generatePersona(locale: PersonaLocale = 'BR'): Persona {
  const firstNames =
    locale === 'BR' ? FIRST_NAMES_BR : locale === 'US' ? FIRST_NAMES_US : FIRST_NAMES_EU;
  const lastNames =
    locale === 'BR' ? LAST_NAMES_BR : locale === 'US' ? LAST_NAMES_US : LAST_NAMES_EU;

  const firstName = pick(firstNames);
  const lastName = pick(lastNames);
  const fullName = `${firstName} ${lastName}`;

  let cityInfo: {city: string; state: string; zipPrefix: string; country?: string};
  let street: string;
  let country: string;

  if (locale === 'BR') {
    cityInfo = pick(CITIES_BR);
    street = pick(STREETS_BR);
    country = 'BR';
  } else if (locale === 'US') {
    cityInfo = pick(CITIES_US);
    street = pick(STREETS_US);
    country = 'US';
  } else {
    cityInfo = pick(CITIES_EU);
    street = pick(STREETS_EU);
    country = (cityInfo as typeof CITIES_EU[number]).country;
  }

  const number = String(secureRandomInt(2000) + 1);
  const domain = pick(DOMAINS);
  const emailLocal = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${secureRandomInt(999)}`.replaceAll(' ', '');
  const phone = phoneForLocale(locale, country);

  // Documents per locale
  let cpf = '';
  let cnpj = '';
  let ssn = '';
  let passport = generatePassportNumber();
  let iban = '';
  let nationalId = '';
  let vatId: string | undefined;

  if (locale === 'BR') {
    cpf = generateCpf(true);
    cnpj = generateCnpj(true);
    ssn = '-';
    iban = `BR${randomDigits(2)}${randomDigits(23)}`;
    nationalId = cpf;
  } else if (locale === 'US') {
    ssn = generateSsn(true);
    cpf = '-';
    cnpj = '-';
    nationalId = ssn;
    iban = `US${randomDigits(2)}${pick(['CHAS', 'BOFA', 'CITI'])}${randomDigits(12)}`;
  } else {
    cpf = '-';
    cnpj = '-';
    ssn = '-';
    iban = generateIban(country);
    nationalId = generateNifEU(country);
    vatId = nationalId;
    // Passport already generated, keep country-specific tweak
    if (country === 'DE') passport = `C${randomDigits(8)}`;
    if (country === 'FR') passport = `${secureRandomInt(90) + 10}FR${randomDigits(5)}`;
  }

  let zip: string;
  if (locale === 'BR') {
    zip = `${cityInfo.zipPrefix}${randomDigits(3)}-${randomDigits(3)}`;
  } else if (locale === 'US') {
    const base = cityInfo.zipPrefix;
    zip = `${base}${randomDigits(5 - base.length)}`.slice(0, 5);
    if (secureRandomInt(3) === 0) zip += `-${randomDigits(4)}`;
  } else {
    zip = cityInfo.zipPrefix;
  }

  const birthDate = randomBirthDate();
  const cc = generateCreditCard();
  const username = `${firstName.toLowerCase()}${lastName.toLowerCase()}${secureRandomInt(9999)}`;
  const password = randomPassword();

  return {
    locale,
    firstName,
    lastName,
    fullName,
    email: `${emailLocal}@${domain}`,
    phone,
    address: `${street}, ${number}`,
    city: cityInfo.city,
    state: cityInfo.state,
    country,
    zip,
    birthDate,
    cpf,
    cnpj,
    ssn,
    passport,
    iban,
    nationalId,
    vatId,
    creditCard: cc.number,
    creditExpiry: cc.expiry,
    creditCvv: cc.cvv,
    username,
    password,
  };
}

export function personasToCsv(personas: Persona[]): string {
  if (personas.length === 0) return '';
  const headers = Object.keys(personas[0]) as (keyof Persona)[];
  const escape = (v: string) => (v.includes(',') || v.includes('"') || v.includes('\n') ? `"${v.replaceAll('"', '""')}"` : v);
  const lines = [headers.join(',')];
  for (const p of personas) lines.push(headers.map(h => escape(String(p[h] ?? ''))).join(','));
  return lines.join('\n');
}
