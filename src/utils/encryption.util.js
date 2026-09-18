const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";
const DEFAULT_PRIMARY_VERSION = "v1";

//  FIX: This in-memory cache ensures heavy parsing runs exactly ONCE on boot.
let cachedKeyRing = null;

/**
 * Loads and parses the encryption key ring from environment variables.
 * Supports:
 * - VAULT_KEYS: JSON string e.g. {"v1":"<64 hex chars>","v2":"<64 hex chars>"}
 * - VAULT_ENCRYPTION_KEY: Single 32-byte hex key (mapped to version "v1")
 * @returns {Record<string, Buffer>}
 */
function loadKeyRing() {
  // If the keys are already parsed and cached locally in-memory, return them instantly
  if (cachedKeyRing) {
    return cachedKeyRing;
  }

  const keys = {};

  if (process.env.VAULT_KEYS) {
    try {
      const parsed = typeof process.env.VAULT_KEYS === "string" 
        ? JSON.parse(process.env.VAULT_KEYS)
        : process.env.VAULT_KEYS;
      
      for (const [ver, keyHex] of Object.entries(parsed)) {
        if (typeof keyHex === "string") {
          const buf = Buffer.from(keyHex.trim(), "hex");
          if (buf.length === 32) {
            const normalizedVersion = ver.startsWith("v") ? ver : `v${ver}`;
            keys[normalizedVersion] = buf;
          }
        }
      }
    } catch (err) {
      console.warn("⚠️ Warning: Failed to parse VAULT_KEYS JSON:", err.message);
    }
  }

  // Fallback / legacy support: map single VAULT_ENCRYPTION_KEY to version 'v1'
  if (process.env.VAULT_ENCRYPTION_KEY) {
    const rawLegacy = process.env.VAULT_ENCRYPTION_KEY.trim();
    const legacyBuf = Buffer.from(rawLegacy, "hex");
    if (legacyBuf.length === 32 && !keys["v1"]) {
      keys["v1"] = legacyBuf;
    }
  }

  // Save parsed buffers to the module-level cache variable
  cachedKeyRing = keys;
  return keys;
}

/**
 * Resolves the currently active primary key version (e.g. 'v1', 'v2').
 * @returns {string}
 */
function getActiveVersion() {
  const active = process.env.PRIMARY_KEY_VERSION || DEFAULT_PRIMARY_VERSION;
  return active.startsWith("v") ? active : `v${active}`;
}

/**
 * Retrieves the encryption key buffer for a specified key version.
 * @param {string} version 
 * @returns {Buffer}
 */
function getKeyForVersion(version) {
  const ring = loadKeyRing();
  const normalized = version.startsWith("v") ? version : `v${version}`;
  const key = ring[normalized];

  if (!key) {
    const availableVersions = Object.keys(ring).join(", ") || "none";
    throw new Error(
      `Encryption key for version "${normalized}" not found in key ring (available: ${availableVersions}).`
    );
  }

  return key;
}

/**
 * Encrypts plaintext string using AES-256-GCM.
 * Prepends version identifier (e.g., "v1:<iv>:<tag>:<cipher>").
 *
 * @param {string} text Plaintext to encrypt
 * @param {string} [version] Specific key version to use (defaults to active version)
 * @returns {string} Versioned encrypted payload
 */
function encrypt(text, version = null) {
  if (text === null || text === undefined) {
    return text;
  }

  const activeVersion = version ? (version.startsWith("v") ? version : `v${version}`) : getActiveVersion();
  const key = getKeyForVersion(activeVersion);

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(String(text), "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return [
    activeVersion,
    iv.toString("hex"),
    authTag.toString("hex"),
    encrypted.toString("hex"),
  ].join(":");
}

/**
 * Decrypts an AES-256-GCM payload.
 * Supports both:
 * - Versioned format: "v1:<iv>:<authTag>:<encrypted>"
 * - Legacy format: "<iv>:<authTag>:<encrypted>" (defaults to key version 'v1')
 *
 * @param {string} payload Encrypted payload string
 * @returns {string} Decrypted plaintext string
 */
function decrypt(payload) {
  if (!payload || typeof payload !== "string") {
    return payload;
  }

  const parts = payload.split(":");
  let version;
  let ivHex;
  let authTagHex;
  let encryptedHex;

  if (parts.length === 4) {
    // Versioned payload: [version, iv, tag, cipher]
    [version, ivHex, authTagHex, encryptedHex] = parts;
  } else if (parts.length === 3) {
    // Legacy unversioned payload: [iv, tag, cipher] -> fallback to 'v1'
    version = "v1";
    [ivHex, authTagHex, encryptedHex] = parts;
  } else {
    throw new Error("Invalid encrypted payload format: incorrect number of segments.");
  }

  const key = getKeyForVersion(version);
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

/**
 * Inspects a payload to extract its encryption key version.
 * @param {string} payload 
 * @returns {string} Version string (e.g. 'v1', 'v2') or 'legacy'
 */
function getKeyVersion(payload) {
  if (!payload || typeof payload !== "string") return null;
  const parts = payload.split(":");
  if (parts.length === 4) return parts[0];
  if (parts.length === 3) return "legacy";
  return null;
}

/**
 * Re-encrypts an existing payload using a target key version (or current active version).
 * @param {string} payload Existing encrypted payload
 * @param {string} [targetVersion] Target version to re-encrypt with
 * @returns {string} Newly encrypted payload with target key version
 */
function reencrypt(payload, targetVersion = null) {
  const plaintext = decrypt(payload);
  return encrypt(plaintext, targetVersion || getActiveVersion());
}

function clearKeyCache() {
  cachedKeyRing = null;
}

module.exports = {
  encrypt,
  decrypt,
  getKeyVersion,
  reencrypt,
  getActiveVersion,
  loadKeyRing,
  clearKeyCache,
};
