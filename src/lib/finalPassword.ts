export function validFinalPassword(password: string) {
  return (
    password.length >= 12 &&
    password === password.trim() &&
    new TextEncoder().encode(password).length <= 72 &&
    !password.includes("\0")
  );
}
