import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const BCRYPT_WORK_FACTOR = 12;

/**
 * Hashes a plaintext password using bcrypt with a work factor cost of 12.
 * @param {string} plainPassword 
 * @returns {Promise<string>} Bcrypt password hash
 */
export const hashPassword = async (plainPassword) => {
  const salt = await bcrypt.genSalt(BCRYPT_WORK_FACTOR);
  return await bcrypt.hash(plainPassword, salt);
};

/**
 * Compares a plaintext password against a stored bcrypt hash.
 * @param {string} plainPassword 
 * @param {string} hashedPassword 
 * @returns {Promise<boolean>} True if password matches
 */
export const comparePassword = async (plainPassword, hashedPassword) => {
  if (!plainPassword || !hashedPassword) return false;
  return await bcrypt.compare(plainPassword, hashedPassword);
};

/**
 * Generates a SHA-256 cryptographic hash of a string (e.g., for refresh tokens or invite tokens).
 * Storing only hashes in MongoDB ensures tokens cannot be compromised if the database is leaked.
 * @param {string} token 
 * @returns {string} Hexadecimal SHA-256 hash string
 */
export const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Generates a cryptographically secure URL-safe random token (default 64 characters).
 * @param {number} bytes Number of random bytes (32 bytes = 64 hex characters)
 * @returns {string} Hexadecimal random token string
 */
export const generateSecureToken = (bytes = 32) => {
  return crypto.randomBytes(bytes).toString('hex');
};

/**
 * Generates a standard UUIDv4 string.
 * @returns {string} UUIDv4 string
 */
export const generateUuid = () => {
  return crypto.randomUUID();
};

export default {
  hashPassword,
  comparePassword,
  hashToken,
  generateSecureToken,
  generateUuid
};
