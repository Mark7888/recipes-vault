export const PASSWORD_RULES: { label: string; message: string; test: (pw: string) => boolean }[] = [
  { label: 'At least 8 characters', message: 'Password must be at least 8 characters', test: (pw) => pw.length >= 8 },
  { label: 'One uppercase letter', message: 'Password must contain at least one uppercase letter', test: (pw) => /[A-Z]/.test(pw) },
  { label: 'One number', message: 'Password must contain at least one number', test: (pw) => /[0-9]/.test(pw) },
];

export function validatePassword(password: string): string | null {
  const failed = PASSWORD_RULES.find((rule) => !rule.test(password));
  return failed ? failed.message : null;
}
