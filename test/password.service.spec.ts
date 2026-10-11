import { PasswordService } from '../src/auth/password.service';

describe('PasswordService', () => {
  const service = new PasswordService();

  it('hashes and verifies passwords without persisting plaintext', async () => {
    const encoded = await service.hash('correct horse battery staple');
    expect(encoded).not.toContain('correct horse battery staple');
    await expect(service.verify('correct horse battery staple', encoded)).resolves.toBe(true);
    await expect(service.verify('wrong password', encoded)).resolves.toBe(false);
  });

  it('rejects unknown hash formats', async () => {
    await expect(service.verify('password', 'plaintext')).resolves.toBe(false);
  });
});
