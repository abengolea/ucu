import type { ReactNode } from 'react';
import { requireMemberPage } from '@/lib/member-session';

export default async function ObservatorioLayout({ children }: { children: ReactNode }) {
  await requireMemberPage('/observatorio');
  return children;
}
