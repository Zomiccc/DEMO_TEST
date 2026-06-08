import { ConfigService } from '@nestjs/config';
import { CryptoService } from './crypto.service';

const KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

function makeService(key = KEY): CryptoService {
  const config = { get: () => key } as unknown as ConfigService;
  return new CryptoService(config);
}

describe('CryptoService (AES-256-GCM)', () => {
  it('round-trips plaintext', () => {
    const svc = makeService();
    const secret = '35202-1234567-1';
    const encrypted = svc.encrypt(secret);
    expect(encrypted).not.toEqual(secret);
    expect(encrypted.split(':')).toHaveLength(3);
    expect(svc.decrypt(encrypted)).toEqual(secret);
  });

  it('produces unique ciphertext per call (random IV)', () => {
    const svc = makeService();
    expect(svc.encrypt('same')).not.toEqual(svc.encrypt('same'));
  });

  it('rejects an invalid key length', () => {
    expect(() => makeService('tooshort')).toThrow();
  });

  it('fails to decrypt tampered payloads', () => {
    const svc = makeService();
    const enc = svc.encrypt('data');
    const [iv, tag, data] = enc.split(':');
    const tampered = `${iv}:${tag}:${data.replace(/.$/, '0')}`;
    expect(() => svc.decrypt(tampered)).toThrow();
  });
});
