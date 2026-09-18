const crypto = require('crypto');
const {
  encrypt,
  decrypt,
  getKeyVersion,
  reencrypt,
  getActiveVersion,
  clearKeyCache, // 🚀 FIX: Import the cache clearing function
} = require('../src/utils/encryption.util');

describe('Cryptographic Key Ring & Versioning Tests', () => {
  const originalEnv = process.env;
  const key1 = crypto.randomBytes(32).toString('hex');
  const key2 = crypto.randomBytes(32).toString('hex');

  beforeEach(() => {
    // 🚀 FIX: Reset the local in-memory cache before every test run 
    // so it doesn't get poisoned by environment changes!
    if (clearKeyCache) clearKeyCache(); 

    process.env = {
      ...originalEnv,
      PRIMARY_KEY_VERSION: 'v1',
      VAULT_KEYS: JSON.stringify({
        v1: key1,
        v2: key2,
      }),
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('Should encrypt with active key version v1 by default', () => {
    const text = 'TopSecretInheritanceKey123!';
    const ciphertext = encrypt(text);

    expect(ciphertext.startsWith('v1:')).toBe(true);
    expect(getKeyVersion(ciphertext)).toBe('v1');

    const decrypted = decrypt(ciphertext);
    expect(decrypted).toBe(text);
  });

  test('Should seamlessly decrypt legacy payloads without version prefix (backward compatibility)', () => {
    const text = 'LegacyColdStorageSeedPhrase';
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(key1, 'hex'), iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    const legacyPayload = `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;

    expect(getKeyVersion(legacyPayload)).toBe('legacy');

    const decrypted = decrypt(legacyPayload);
    expect(decrypted).toBe(text);
  });

  test('Should support encrypting with a newer key version (v2) and decrypting both v1 and v2', () => {
    const text1 = 'DataEncryptedWithV1';
    const text2 = 'DataEncryptedWithV2';

    const cipher1 = encrypt(text1, 'v1');
    const cipher2 = encrypt(text2, 'v2');

    expect(cipher1.startsWith('v1:')).toBe(true);
    expect(cipher2.startsWith('v2:')).toBe(true);

    expect(decrypt(cipher1)).toBe(text1);
    expect(decrypt(cipher2)).toBe(text2);
  });

  test('Should re-encrypt payload from v1 to v2 (Key Rotation)', () => {
    const text = 'RotateMeToV2';
    const cipherV1 = encrypt(text, 'v1');
    expect(getKeyVersion(cipherV1)).toBe('v1');

    const cipherV2 = reencrypt(cipherV1, 'v2');
    expect(getKeyVersion(cipherV2)).toBe('v2');
    expect(cipherV2.startsWith('v2:')).toBe(true);
    expect(decrypt(cipherV2)).toBe(text);
  });

  test('Should fail if ciphertext was tampered with (AuthTag validation)', () => {
    const cipher = encrypt('SensitiveData');
    const parts = cipher.split(':');
    const tampered = `${parts[0]}:${parts[1]}:${parts[2]}:${parts[3].slice(0, -2)}00`;

    expect(() => decrypt(tampered)).toThrow();
  });

  test('Should fail gracefully if key version does not exist in key ring', () => {
    const fakePayload = 'v99:123456789012345678901234:12345678901234567890123456789012:abcdef';
    expect(() => decrypt(fakePayload)).toThrow(/Encryption key for version "v99" not found/);
  });
});
