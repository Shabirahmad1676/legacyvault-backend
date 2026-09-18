const argon2 = require('@node-rs/argon2');
const bcrypt = require('bcryptjs');

/**
 * Standard OWASP / RFC 9106 recommended Argon2id parameters.
 * - Memory Cost: 19456 KiB (~19 MB, OWASP recommended minimum for web servers)
 * - Time Cost: 2 iterations
 * - Parallelism: 1 lane
 * - Algorithm: Argon2id (hybrid resistant to both side-channel and GPU attacks)
 */
const ARGON2_CONFIG = {
  memoryCost: 19456,
  timeCost: 2,
  outputLen: 32,
  parallelism: 1,
  algorithm: argon2.Algorithm.Argon2id,
};

/**
 * Hashes a plaintext password using Argon2id.
 * @param {string} password Plaintext password
 * @returns {Promise<string>} Argon2id encoded hash string
 */
async function hashPassword(password) {
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a valid non-empty string.');
  }
  return await argon2.hash(password, ARGON2_CONFIG);
}

/**
 * Verifies a plaintext password against a stored hash.
 * Supports both Argon2id ($argon2id$) and legacy bcrypt ($2a$, $2b$, $2y$) hashes.
 *
 * @param {string} password Plaintext candidate password
 * @param {string} hash Stored password hash
 * @returns {Promise<boolean>} True if password matches hash, false otherwise
 */
async function verifyPassword(password, hash) {
  if (!password || !hash || typeof password !== 'string' || typeof hash !== 'string') {
    return false;
  }

  try {
    // 1. Argon2 hash format
    if (hash.startsWith('$argon2')) {
      return await argon2.verify(hash, password);
    }

    // 2. Legacy bcrypt hash format ($2a$, $2b$, $2y$)
    if (hash.startsWith('$2')) {
      return await bcrypt.compare(password, hash);
    }

    return false;
  } catch (err) {
    return false;
  }
}

/**
 * Determines whether a stored hash needs to be re-hashed with modern Argon2id.
 * Returns true if the stored hash is legacy bcrypt ($2a$, $2b$, etc.).
 *
 * @param {string} hash Stored password hash
 * @returns {boolean} True if password should be upgraded to Argon2id
 */
function needsRehash(hash) {
  if (!hash || typeof hash !== 'string') return false;
  return hash.startsWith('$2');
}

/**
 * Validates password strength according to NIST SP 800-63B guidelines.
 * Requires:
 * - Minimum 10 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one digit
 * - At least one special character
 *
 * @param {string} password 
 * @returns {{ valid: boolean, message?: string }}
 */
function validatePasswordStrength(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Password is required.' };
  }
  if (password.length < 10) {
    return { valid: false, message: 'Password must be at least 10 characters long.' };
  }
  if (password.length > 128) {
    return { valid: false, message: 'Password must not exceed 128 characters.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter.' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter.' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one digit.' };
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one special character.' };
  }
  return { valid: true };
}

module.exports = {
  hashPassword,
  verifyPassword,
  needsRehash,
  validatePasswordStrength,
};

