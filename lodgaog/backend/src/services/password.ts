import bcrypt from 'bcryptjs';

/**
 * Hashes a plaintext password using bcrypt with a minimum of 12 salt rounds.
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Compares a plaintext password against a hashed password.
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
