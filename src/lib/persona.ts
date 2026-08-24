import {secureRandomInt, secureRandomBytes} from './random';

const FIRST_NAMES = [
  'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery', 'Quinn', 'Sage', 'Rowan',
  'Alice', 'Bruno', 'Carla', 'Diego', 'Eva', 'Felipe', 'Gabi', 'Hugo', 'Iara', 'Joao',
  'Lina', 'Marcos', 'Nina', 'Oscar', 'Paula', 'Rafa', 'Sofia', 'Tiago', 'Vitor', 'Lara',
  'Maya', 'Noah', 'Liam', 'Emma', 'Oliver', 'Isabella', 'Lucas', 'Helena', 'Miguel', 'Laura',
];

const LAST_NAMES = [
  'Silva', 'Santos', 'Oliveira', 'Souza', 'Lima', 'Costa', 'Pereira', 'Rodrigues', 'Almeida', 'Nascimento',
  'Araujo', 'Melo', 'Barbosa', 'Ribeiro', 'Martins', 'Carvalho', 'Lopes', 'Soares', 'Fernandes', 'Gomes',
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Lopez', 'Wilson',
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

const STREETS = [
  'Rua das Flores', 'Av. Paulista', 'Rua Augusta', 'Alameda Santos', 'Rua Oscar Freire',
  'Av. Atlantica', 'Rua XV de Novembro', 'Av. Brasil', 'Rua da Consolacao', 'Alameda Lorena',
];

const DOMAINS = ['example.com', 'mail.test', 'inbox.test', 'privacy.local'];

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
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  cpf: string;
  cnpj: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  birthDate: string;
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

export function generatePersona(): Persona {
  const firstName = pick(FIRST_NAMES);
  const lastName = pick(LAST_NAMES);
  const fullName = `${firstName} ${lastName}`;
  const cityInfo = pick(CITIES_BR);
  const street = pick(STREETS);
  const number = String(secureRandomInt(2000) + 1);
  const domain = pick(DOMAINS);
  const emailLocal = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${secureRandomInt(999)}`.replaceAll(' ', '');
  const area = String(secureRandomInt(80) + 10);
  const phone = `+55 ${area} 9${randomDigits(4)}-${randomDigits(4)}`;
  const cpf = generateCpf(true);
  const cnpj = generateCnpj(true);
  const zip = `${cityInfo.zipPrefix}${randomDigits(3)}-${randomDigits(3)}`;
  const birthDate = randomBirthDate();
  const cc = generateCreditCard();
  const username = `${firstName.toLowerCase()}${lastName.toLowerCase()}${secureRandomInt(9999)}`;
  const password = randomPassword();

  return {
    firstName,
    lastName,
    fullName,
    email: `${emailLocal}@${domain}`,
    phone,
    cpf,
    cnpj,
    address: `${street}, ${number}`,
    city: cityInfo.city,
    state: cityInfo.state,
    zip,
    birthDate,
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
  for (const p of personas) lines.push(headers.map(h => escape(String(p[h]))).join(','));
  return lines.join('\n');
}
