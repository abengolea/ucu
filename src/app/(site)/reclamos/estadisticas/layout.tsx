import type { ReactNode } from 'react';
import { requireMemberPage } from '@/lib/member-session';

export default async function EstadisticasLayout({ children }: { children: ReactNode }) {
  await requireMemberPage('/reclamos/estadisticas');
  return children;
}
