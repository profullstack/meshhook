/**
 * Secret encryption (AES-256-GCM).
 *
 * The secrets table stores ciphertext in value_encrypted. The old web route
 * inserted the plaintext with a comment saying "encryption handled by database
 * trigger", but no such trigger existed in any migration — secrets were being
 * written in the clear. Postgres could at least have done this with pgcrypto;
 * SQLite has no equivalent, so encryption lives here and is unavoidable on the
 * write path.
 *
 * Format: v1:<iv-base64>:<authTag-base64>:<ciphertext-base64>
 * The version prefix leaves room to rotate the scheme later.
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits, the standard nonce size for GCM
const KEY_LENGTH = 32;
const VERSION = "v1";

/**
 * Resolve the encryption key from the environment.
 *
 * Accepts a 64-character hex string or a 32-byte base64 value. Any other input
 * is hashed to the right length rather than being rejected, so an operator
 * passing a long passphrase still gets a usable key — but a short or missing
 * one is a hard error, because silently encrypting with a weak key is worse
 * than failing to start.
 */
export function resolveKey(env = process.env) {
  const raw = env.SECRETS_ENCRYPTION_KEY ?? env.MESHHOOK_ENCRYPTION_KEY;

  if (!raw) {
    throw new Error(
      "SECRETS_ENCRYPTION_KEY is not set. Generate one with: " +
        "openssl rand -hex 32",
    );
  }

  if (/^[0-9a-f]{64}$/i.test(raw)) {
    return Buffer.from(raw, "hex");
  }

  const asBase64 = Buffer.from(raw, "base64");
  if (asBase64.length === KEY_LENGTH) {
    return asBase64;
  }

  if (raw.length < 32) {
    throw new Error(
      "SECRETS_ENCRYPTION_KEY is too short. Provide 32 bytes as hex (64 chars) " +
        "or base64, or a passphrase of at least 32 characters.",
    );
  }

  return createHash("sha256").update(raw).digest();
}

/**
 * Encrypt a secret value.
 * @param {string} plaintext
 * @param {Buffer} [key] Defaults to the environment key.
 * @returns {string} The encoded ciphertext.
 */
export function encryptSecret(plaintext, key = resolveKey()) {
  if (typeof plaintext !== "string") {
    throw new Error("Secret value must be a string");
  }

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    VERSION,
    iv.toString("base64"),
    authTag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(":");
}

/**
 * Decrypt a secret value.
 *
 * Throws when the ciphertext has been tampered with — GCM authentication
 * failure is a real signal, not something to swallow and return null for.
 *
 * @param {string} encoded
 * @param {Buffer} [key]
 * @returns {string} The plaintext.
 */
export function decryptSecret(encoded, key = resolveKey()) {
  if (typeof encoded !== "string") {
    throw new Error("Encrypted secret must be a string");
  }

  const parts = encoded.split(":");
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error("Malformed encrypted secret");
  }

  const [, ivB64, tagB64, dataB64] = parts;
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

/** True when the environment is configured well enough to store secrets. */
export function encryptionConfigured(env = process.env) {
  try {
    resolveKey(env);
    return true;
  } catch {
    return false;
  }
}
