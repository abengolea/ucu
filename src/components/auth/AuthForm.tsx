'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2, Lock, Mail, User } from 'lucide-react';
import { GoogleIcon } from '@/components/auth/GoogleIcon';
import { BrandStripe } from '@/components/Logo';
import {
  firebaseAuthErrorMessage,
  registerWithEmailPasswordIdToken,
  sendMemberPasswordReset,
  signInWithEmailPasswordIdToken,
  signInWithGoogleIdToken,
} from '@/lib/firebase-auth';
import { authGateCopy, MEMBER_LOGIN_PATH, MEMBER_RECOVER_PATH, MEMBER_REGISTER_PATH } from '@/lib/member-paths';

export type AuthFormMode = 'login' | 'register' | 'recover';

type AuthFormProps = {
  mode: AuthFormMode;
  nextPath: string;
};

async function completeSession(idToken: string, name?: string): Promise<void> {
  const res = await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ idToken, name }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : 'No se pudo iniciar sesión');
  }
}

function withNext(href: string, nextPath: string): string {
  if (!nextPath || nextPath === '/') return href;
  return `${href}?next=${encodeURIComponent(nextPath)}`;
}

export function AuthForm({ mode, nextPath }: AuthFormProps) {
  const copy = authGateCopy(nextPath);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [recoverSent, setRecoverSent] = useState(false);

  const busy = isLoading || isGoogleLoading;

  async function handleGoogle() {
    setIsGoogleLoading(true);
    setError('');
    try {
      const idToken = await signInWithGoogleIdToken();
      await completeSession(idToken);
      window.location.assign(nextPath || '/');
    } catch (err) {
      setError(firebaseAuthErrorMessage(err));
    } finally {
      setIsGoogleLoading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (mode === 'recover') {
        await sendMemberPasswordReset(email);
        setRecoverSent(true);
        return;
      }

      if (mode === 'register') {
        if (name.trim().length < 2) {
          setError('Indicá tu nombre.');
          return;
        }
        if (password.length < 6) {
          setError('La contraseña tiene que tener al menos 6 caracteres.');
          return;
        }
        if (password !== confirm) {
          setError('Las contraseñas no coinciden.');
          return;
        }
        const idToken = await registerWithEmailPasswordIdToken(email, password, name);
        await completeSession(idToken, name);
        window.location.assign(nextPath || '/');
        return;
      }

      const idToken = await signInWithEmailPasswordIdToken(email, password);
      await completeSession(idToken);
      window.location.assign(nextPath || '/');
    } catch (err) {
      setError(firebaseAuthErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="mx-auto grid max-w-5xl gap-8 px-4 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:px-6 lg:py-16">
      <section className="relative overflow-hidden rounded-xl bg-ucu-nav text-white">
        <BrandStripe />
        <div className="px-6 py-10 md:px-8 md:py-12">
          <p className="mb-3 font-display text-xs font-bold uppercase tracking-[0.2em] text-ucu-yellow">
            {copy.eyebrow}
          </p>
          <h1 className="max-w-md text-balance font-display text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">
            {copy.title}
          </h1>
          <p className="mt-4 max-w-md font-serif text-base leading-relaxed text-white/80">
            {copy.description}
          </p>
          <ul className="mt-8 space-y-3 font-display text-sm text-white/85">
            <li className="flex gap-3">
              <span className="mt-0.5 text-ucu-green" aria-hidden>
                →
              </span>
              Observatorio de fallos de consumo
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5 text-ucu-yellow" aria-hidden>
                →
              </span>
              Estadísticas de denuncias por empresa
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5 text-ucu-magenta" aria-hidden>
                →
              </span>
              Registro gratuito, sin costo
            </li>
          </ul>
        </div>
      </section>

      <section className="ucu-card ucu-accent-top p-6 md:p-8">
        {mode === 'recover' ? (
          recoverSent ? (
            <div>
              <h2 className="font-display text-xl font-bold tracking-tight text-[var(--ink)]">
                Revisá tu email
              </h2>
              <p className="mt-3 font-serif text-sm leading-relaxed text-[var(--ink-muted)]">
                Si hay una cuenta con {email.trim() || 'ese email'}, te enviamos un enlace para
                elegir una contraseña nueva.
              </p>
              <Link
                href={withNext(MEMBER_LOGIN_PATH, nextPath)}
                className="ucu-btn-primary mt-6 inline-flex"
              >
                Volver a ingresar
              </Link>
            </div>
          ) : (
            <>
              <h2 className="font-display text-xl font-bold tracking-tight text-[var(--ink)]">
                Recuperar contraseña
              </h2>
              <p className="mt-2 font-serif text-sm text-[var(--ink-muted)]">
                Te mandamos un enlace para elegir una contraseña nueva.
              </p>
              {error ? <AuthError message={error} /> : null}
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <EmailField value={email} onChange={setEmail} disabled={busy} />
                <button type="submit" disabled={busy} className="ucu-btn-primary w-full disabled:opacity-60">
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Enviando…
                    </>
                  ) : (
                    'Enviar enlace'
                  )}
                </button>
              </form>
              <p className="mt-6 font-serif text-sm text-[var(--ink-muted)]">
                <Link
                  href={withNext(MEMBER_LOGIN_PATH, nextPath)}
                  className="font-display font-semibold text-ucu-blue hover:underline"
                >
                  Volver a ingresar
                </Link>
              </p>
            </>
          )
        ) : (
          <>
            <h2 className="font-display text-xl font-bold tracking-tight text-[var(--ink)]">
              {mode === 'register' ? 'Crear cuenta' : 'Ingresar'}
            </h2>
            <p className="mt-2 font-serif text-sm text-[var(--ink-muted)]">
              {mode === 'register'
                ? 'Completá tus datos o usá la cuenta de Google.'
                : 'Usá Google o tu email y contraseña.'}
            </p>

            {error ? <AuthError message={error} /> : null}

            <button
              type="button"
              onClick={handleGoogle}
              disabled={busy}
              className="mt-6 flex w-full items-center justify-center gap-3 rounded-md border border-[var(--border-strong)] bg-[var(--surface-raised)] py-3 font-display text-sm font-semibold text-[var(--ink)] transition hover:border-ucu-blue/40 hover:text-ucu-blue disabled:opacity-60"
            >
              {isGoogleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
              Continuar con Google
            </button>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-[var(--border)]" />
              <span className="font-display text-[0.65rem] font-bold uppercase tracking-[0.16em] text-[var(--ink-faint)]">
                o con usuario y contraseña
              </span>
              <div className="h-px flex-1 bg-[var(--border)]" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' ? (
                <label className="block">
                  <span className="mb-1 block font-display text-sm font-medium text-[var(--ink)]">
                    Nombre
                  </span>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-faint)]" />
                    <input
                      className="field-input pl-10"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoComplete="name"
                      required
                      disabled={busy}
                    />
                  </div>
                </label>
              ) : null}

              <EmailField value={email} onChange={setEmail} disabled={busy} />

              <label className="block">
                <span className="mb-1 block font-display text-sm font-medium text-[var(--ink)]">
                  Contraseña
                </span>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-faint)]" />
                  <input
                    type="password"
                    className="field-input pl-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                    required
                    minLength={6}
                    disabled={busy}
                  />
                </div>
              </label>

              {mode === 'register' ? (
                <label className="block">
                  <span className="mb-1 block font-display text-sm font-medium text-[var(--ink)]">
                    Repetí la contraseña
                  </span>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-faint)]" />
                    <input
                      type="password"
                      className="field-input pl-10"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      autoComplete="new-password"
                      required
                      minLength={6}
                      disabled={busy}
                    />
                  </div>
                </label>
              ) : null}

              <button type="submit" disabled={busy} className="ucu-btn-primary w-full disabled:opacity-60">
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {mode === 'register' ? 'Creando cuenta…' : 'Ingresando…'}
                  </>
                ) : mode === 'register' ? (
                  'Crear cuenta'
                ) : (
                  'Ingresar'
                )}
              </button>
            </form>

            <div className="mt-6 space-y-2 font-serif text-sm text-[var(--ink-muted)]">
              {mode === 'login' ? (
                <>
                  <p>
                    ¿No tenés cuenta?{' '}
                    <Link
                      href={withNext(MEMBER_REGISTER_PATH, nextPath)}
                      className="font-display font-semibold text-ucu-blue hover:underline"
                    >
                      Registrate
                    </Link>
                  </p>
                  <p>
                    <Link
                      href={withNext(MEMBER_RECOVER_PATH, nextPath)}
                      className="font-display font-semibold text-ucu-blue hover:underline"
                    >
                      Olvidé mi contraseña
                    </Link>
                  </p>
                </>
              ) : (
                <p>
                  ¿Ya tenés cuenta?{' '}
                  <Link
                    href={withNext(MEMBER_LOGIN_PATH, nextPath)}
                    className="font-display font-semibold text-ucu-blue hover:underline"
                  >
                    Ingresá
                  </Link>
                </p>
              )}
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function EmailField({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block font-display text-sm font-medium text-[var(--ink)]">
        Email
      </span>
      <div className="relative">
        <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-faint)]" />
        <input
          type="email"
          className="field-input pl-10"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="username"
          required
          disabled={disabled}
        />
      </div>
    </label>
  );
}

function AuthError({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 font-serif text-sm text-red-800"
    >
      {message}
    </div>
  );
}
