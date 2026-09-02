export interface PasswordPolicyResult {
  valid: boolean;
  errors: string[];
}

const COMMON_WEAK_PASSWORDS = new Set([
  "password",
  "password123",
  "12345678",
  "123456789",
  "qwertyuiop",
  "billora123",
  "admin123",
  "welcome123",
]);

/**
 * NIST 800-63B Password Standard:
 * - Minimum 8 characters, maximum 128 characters
 * - No arbitrary composition rules (allows long passphrases)
 * - Blocklists common trivial/breached passwords
 */
export const passwordPolicy = {
  minLength: 8,
  maxLength: 128,

  validate(password: string): PasswordPolicyResult {
    const errors: string[] = [];

    if (!password || password.length < this.minLength) {
      errors.push(`Password must be at least ${this.minLength} characters long`);
    }

    if (password && password.length > this.maxLength) {
      errors.push(`Password must not exceed ${this.maxLength} characters`);
    }

    if (password && COMMON_WEAK_PASSWORDS.has(password.toLowerCase())) {
      errors.push("This password is too common and easily guessed. Please choose a more secure password.");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },
};
