import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthForm } from '@/components/auth/AuthForm';
import { getViewer } from '@/lib/member-session';
import { safeNextPath } from '@/lib/member-paths';
import { buildPageMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = buildPageMetadata({
  title: 'Crear cuenta',
  description:
    'Registrate en UCU con Google o con email y contraseña para consultar el Observatorio de fallos y las estadísticas de denuncias. Es gratuito.',
  path: '/registrarse',
  noIndex: true,
});

export default async function RegistrarsePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const params = await searchParams;
  const nextPath = safeNextPath(typeof params.next === 'string' ? params.next : undefined);
  const viewer = await getViewer();
  if (viewer) redirect(nextPath);

  return <AuthForm mode="register" nextPath={nextPath} />;
}
