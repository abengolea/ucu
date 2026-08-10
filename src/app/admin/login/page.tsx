'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Lock, Mail } from 'lucide-react';
import {
  signInWithEmailPasswordIdToken,
  signInWithGoogleIdToken,
} from '@/lib/firebase-auth';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('abengolea1@gmail.com');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleGoogleLogin() {
    setIsGoogleLoading(true);
    setError('');

    try {
      const idToken = await signInWithGoogleIdToken();
      const res = await fetch('/api/admin/login/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ idToken }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'No se pudo ingresar con Google');
        return;
      }

      router.push('/admin');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al iniciar sesión con Google';
      if (message.includes('popup-closed-by-user')) {
        setError('Inicio de sesión cancelado.');
      } else {
        setError(message);
      }
    } finally {
      setIsGoogleLoading(false);
    }
  }

  async function completeFirebaseSession(idToken: string): Promise<boolean> {
    const res = await fetch('/api/admin/login/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ idToken }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof data.error === 'string' ? data.error : 'No se pudo iniciar sesión');
      return false;
    }
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // 1) Contraseña definida vía Firebase reset / Auth
      try {
        const idToken = await signInWithEmailPasswordIdToken(email, password);
        if (await completeFirebaseSession(idToken)) {
          router.push('/admin');
          return;
        }
        return;
      } catch {
        // Seguir con contraseña interna del panel
      }

      // 2) Contraseña guardada en admin_users (hash propio)
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Credenciales incorrectas');
        return;
      }

      router.push('/admin');
    } catch {
      setError('Error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  }

  const busy = isLoading || isGoogleLoading;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#1a5fb4] text-xl font-bold text-white">
            U
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Panel UCU</h1>
          <p className="mt-2 text-sm text-slate-500">Acceso para publicar notas y fallos</p>
        </div>

        {error ? (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={busy}
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          {isGoogleLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <GoogleIcon />
          )}
          Continuar con Google
        </button>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-xs uppercase tracking-wide text-slate-400">o con contraseña</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#1a5fb4] focus:ring-2 focus:ring-[#1a5fb4]/20"
                autoComplete="username"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#1a5fb4] focus:ring-2 focus:ring-[#1a5fb4]/20"
                autoComplete="current-password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center rounded-lg bg-[#1a5fb4] py-3 text-sm font-semibold text-white hover:bg-[#154a8a] disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Ingresando...
              </>
            ) : (
              'Ingresar con contraseña'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}
