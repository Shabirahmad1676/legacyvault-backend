const bcrypt = require('bcryptjs');
const {
  hashPassword,
  verifyPassword,
  needsRehash,
  validatePasswordStrength,
} = require('../src/utils/password.util');

describe('Password Security & Argon2id Utility Tests', () => {
  const plainPassword = 'SuperStrongPassword123!';

  test('Should hash password using Argon2id algorithm', async () => {
    const hash = await hashPassword(plainPassword);

    expect(typeof hash).toBe('string');
    expect(hash.startsWith('$argon2id$')).toBe(true);

    // Verify correct password matches
    const isMatch = await verifyPassword(plainPassword, hash);
    expect(isMatch).toBe(true);

    // Verify wrong password fails
    const isWrongMatch = await verifyPassword('WrongPassword123!', hash);
    expect(isWrongMatch).toBe(false);

    // Argon2id hashes should NOT require re-hash
    expect(needsRehash(hash)).toBe(false);
  });

  test('Should seamlessly verify legacy bcrypt hashes and signal re-hash needed', async () => {
    // Generate a legacy bcrypt hash with salt rounds 10
    const salt = await bcrypt.genSalt(10);
    const legacyBcryptHash = await bcrypt.hash(plainPassword, salt);

    expect(legacyBcryptHash.startsWith('$2')).toBe(true);

    // Verify legacy hash matches
    const isMatch = await verifyPassword(plainPassword, legacyBcryptHash);
    expect(isMatch).toBe(true);

    // Verify wrong password against legacy hash fails
    const isWrongMatch = await verifyPassword('IncorrectPassword123!', legacyBcryptHash);
    expect(isWrongMatch).toBe(false);

    // Should indicate that re-hash to Argon2id is required
    expect(needsRehash(legacyBcryptHash)).toBe(true);
  });

  test('Should enforce NIST password strength rules', () => {
    // Valid password
    expect(validatePasswordStrength('ValidPass123!').valid).toBe(true);

    // Too short (<10 chars)
    const shortCheck = validatePasswordStrength('Short1!');
    expect(shortCheck.valid).toBe(false);
    expect(shortCheck.message).toMatch(/at least 10 characters/);

    // Missing uppercase
    expect(validatePasswordStrength('lowercase123!').valid).toBe(false);

    // Missing lowercase
    expect(validatePasswordStrength('UPPERCASE123!').valid).toBe(false);

    // Missing digit
    expect(validatePasswordStrength('NoDigitsHere!').valid).toBe(false);

    // Missing special char
    expect(validatePasswordStrength('NoSpecialChar123').valid).toBe(false);
  });
});

