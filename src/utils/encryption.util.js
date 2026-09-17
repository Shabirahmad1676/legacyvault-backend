const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";

const rawKey = (process.env.VAULT_ENCRYPTION_KEY);
const ENCRYPTION_KEY = Buffer.from(rawKey, "hex");

if (ENCRYPTION_KEY.length !== 32) {
  throw new Error(
    "VAULT_ENCRYPTION_KEY must be exactly 32 bytes (64 hex characters)."
  );
}

function encrypt(text) {
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv(
    ALGORITHM,
    ENCRYPTION_KEY,
    iv
  );

  const encrypted = Buffer.concat([
    cipher.update(text, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return [
    iv.toString("hex"),
    authTag.toString("hex"),
    encrypted.toString("hex"),
  ].join(":");
}

function decrypt(payload) {
  const [ivHex, authTagHex, encryptedHex] =
    payload.split(":");

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    ENCRYPTION_KEY,
    iv
  );

  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

module.exports = {
  encrypt,
  decrypt,
};