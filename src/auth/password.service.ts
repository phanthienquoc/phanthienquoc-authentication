import { Injectable } from '@nestjs/common';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);

@Injectable()
export class PasswordService {
  async hash(password: string): Promise<string> {
    // Keep the existing TCE-compatible salt:hex representation for existing accounts.
    const salt = randomBytes(16).toString('hex');
    const key = (await scrypt(password, salt, 64)) as Buffer;
    return `${salt}:${key.toString('hex')}`;
  }

  async verify(password: string, encoded: string): Promise<boolean> {
    const [salt, hex] = encoded.split(':');
    if (!salt || !hex || !/^[a-f0-9]{32}$/.test(salt) || !/^[a-f0-9]{128}$/.test(hex)) {
      return false;
    }
    const actual = (await scrypt(password, salt, 64)) as Buffer;
    const expected = Buffer.from(hex, 'hex');
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }

  async hashToken(token: string): Promise<string> {
    return createHash('sha256').update(token).digest('hex');
  }
}
