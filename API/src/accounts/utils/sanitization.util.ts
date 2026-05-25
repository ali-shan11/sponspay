/**
 * Sanitizes string input by trimming whitespace and removing potentially harmful characters
 * @param input - The string to sanitize
 * @returns Sanitized string or null if input is null/undefined
 */
export function sanitizeString(
  input: string | null | undefined,
): string | null {
  if (input === null || input === undefined) {
    return null;
  }

  // Trim whitespace
  let sanitized = input.trim();

  // Remove potentially harmful characters that could be used for XSS
  // Keep alphanumeric, spaces, common punctuation, and international characters
  sanitized = sanitized.replace(/[<>"'&]/g, '');

  // Return null if string becomes empty after sanitization
  return sanitized.length > 0 ? sanitized : null;
}

/**
 * Sanitizes full name input with additional validation
 * @param fullName - The full name to sanitize
 * @returns Sanitized full name
 */
export function sanitizeFullName(fullName: string): string {
  const sanitized = sanitizeString(fullName);
  if (!sanitized) {
    throw new Error('Full name cannot be empty after sanitization');
  }
  return sanitized;
}

/**
 * Sanitizes nickname input (can be null)
 * @param nickname - The nickname to sanitize
 * @returns Sanitized nickname or null
 */
export function sanitizeNickname(
  nickname: string | null | undefined,
): string | null {
  return sanitizeString(nickname);
}
