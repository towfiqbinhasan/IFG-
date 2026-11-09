/**
 * Username <-> internal email mapping.
 * Users only ever type a username; Supabase Auth needs an email, so we use
 * `<username>@lab.local`. The domain is configurable but must stay constant
 * once users exist.
 */
export const USERNAME_EMAIL_DOMAIN = process.env.NEXT_PUBLIC_USERNAME_EMAIL_DOMAIN || "lab.local";

/** Lab prefix used in auto-generated usernames: Name.IFL.01 */
export const LAB_USERNAME_PREFIX = "IFL";

/** Usernames may contain uppercase letters for display (e.g. Rahim.IFL.01). */
export const USERNAME_REGEX = /^[a-zA-Z0-9._-]{3,32}$/;

/** Lowercase a username for auth (email) lookups — display name keeps its case. */
export function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

export function usernameToEmail(username: string) {
  return `${normalizeUsername(username)}@${USERNAME_EMAIL_DOMAIN}`;
}

/**
 * Generate the next IFL username from a full name and the current member count.
 * "Rahim Uddin" + count 0 → "Rahim.IFL.01"
 */
export function generateIFLUsername(fullName: string, nextNumber: number): string {
  const firstName = fullName.trim().split(/\s+/)[0] ?? "User";
  const capitalized = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
  const padded = String(nextNumber).padStart(2, "0");
  return `${capitalized}.${LAB_USERNAME_PREFIX}.${padded}`;
}

export const PASSWORD_MIN_LENGTH = 8;

/** Returns an error message, or null when the password is acceptable. */
export function validatePassword(pw: string): string | null {
  if (pw.length < PASSWORD_MIN_LENGTH) return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return "Password must contain letters and numbers.";
  return null;
}
