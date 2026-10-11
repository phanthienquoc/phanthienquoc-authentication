import { PasswordService } from '../src/auth/password.service';

describe('PasswordService', () => {
  const service = new PasswordService();

  it('preserves the existing TCE salt:hex storage format', async () => {
    const encoded = await service.hash('correct horse battery staple');
    expect(encoded).toMatch(/^[a-f0-9]{32}:[a-f0-9]{128}$/);
    await expect(service.verify('correct horse battery staple', encoded)).resolves.toBe(true);
    await expect(service.verify('wrong password', encoded)).resolves.toBe(false);
  });

  it('rejects malformed or unsupported hashes', async () => {
    await expect(service.verify('password', 'plaintext')).resolves.toBe(false);
    await expect(service.verify('password', 'not-a-valid-salt:bad')).resolves.toBe(false);
  });

  it('hashes refresh tokens using a stable one-way digest', () => {
    const first = service.hashToken('random-high-entropy-token');
    const second = service.hashToken('random-high-entropy-token');
    expect(first).toHaveLength(64);
    expect(first).toBe(second);
    expect(first).not.toContain('random-high-entropy-token');
  });
});
