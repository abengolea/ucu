import 'server-only';

/**
 * Verifica email/password contra Firebase Authentication (Identity Toolkit).
 * Sirve para contraseñas definidas vía generatePasswordResetLink / cliente Auth.
 */
export async function verifyFirebaseEmailPassword(
  email: string,
  password: string
): Promise<boolean> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim();
  if (!apiKey || !email.trim() || !password.trim()) return false;

  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          returnSecureToken: true,
        }),
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}
