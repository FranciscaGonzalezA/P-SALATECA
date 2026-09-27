import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const keyLength = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = (await scrypt(password, salt, keyLength)) as Buffer;
  return `scrypt:${salt}:${derivedKey.toString('hex')}`;
}

export async function verifyPassword(password: string, encodedHash: string): Promise<boolean> {
  const [algorithm, salt, expectedHex] = encodedHash.split(':');
  const validEncoding =
    algorithm === 'scrypt' && Boolean(salt) && /^[a-f0-9]{128}$/i.test(expectedHex ?? '');
  const safeSalt = validEncoding ? salt! : '00000000000000000000000000000000';
  const expected = Buffer.from(validEncoding ? expectedHex! : '00'.repeat(keyLength), 'hex');
  const actual = (await scrypt(password, safeSalt, keyLength)) as Buffer;
  return validEncoding && timingSafeEqual(actual, expected);
}
