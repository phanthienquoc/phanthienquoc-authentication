import { Injectable } from '@nestjs/common';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);

@Injectable()
export class PasswordService {
  async hash(password: string): Promise<string> {
    const salt = randomBytes(16).toString('base64url');
    const key = (await scrypt(password, salt, 64)) as Buffer;
    return `scrypt$${salt}$${key.toString('base64url')}`;
  }

  async verify(password: string, encoded: string): Promise<boolean> {
    const [algorithm, salt, expected] = encoded.split('$');
    if (algorithm !== 'scrypt' || !salt || !expected) return false;
    const actual = (await scrypt(password, salt, 64)) as Buffer;
    const target = Buffer.from(expected, 'base64url');
    return actual.length === target.length && timingSafeEqual(actual, target);
  }
}
