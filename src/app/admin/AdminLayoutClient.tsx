'use client';

import { usePathname } from 'next/navigation';
import { AdminAuth } from '@/components/admin/AdminAuth';
import { AdminShell } from '@/components/admin/AdminShell';

export function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  return (
    <AdminAuth>
      <AdminShell>{children}</AdminShell>
    </AdminAuth>
  );
}
