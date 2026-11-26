import type { ReactNode } from 'react';
import { requireMemberPage } from '@/lib/member-session';

export default async function ObservatorioMiembrosLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireMemberPage('/observatorio/fallos');
  return children;
}
