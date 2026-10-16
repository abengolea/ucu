import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthForm } from '@/components/auth/AuthForm';
import { getViewer } from '@/lib/member-session';
import { safeNextPath } from '@/lib/member-paths';
import { buildPageMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = buildPageMetadata({
  title: 'Recuperar contraseña',
  description: 'Recuperá el acceso a tu cuenta UCU.',
  path: '/ingresar/recuperar',
  noIndex: true,
});

export default async function RecuperarPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const params = await searchParams;
  const nextPath = safeNextPath(typeof params.next === 'string' ? params.next : undefined);
  const viewer = await getViewer();
  if (viewer) redirect(nextPath);

  return <AuthForm mode="recover" nextPath={nextPath} />;
}
