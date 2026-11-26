import type { ReactNode } from 'react';
import { requireMemberPage } from '@/lib/member-session';

export default async function InvestigacionesLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireMemberPage('/investigaciones');
  return children;
}
