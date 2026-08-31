'use client';

import { usePathname } from 'next/navigation';
import {
  AdminReclamoAlertBell,
  AdminReclamoAlertsProvider,
} from '@/components/admin/AdminReclamoAlerts';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { SidebarProvider, useSidebar } from '@/components/admin/AdminSidebarContext';
import { AdminUserMenu } from '@/components/admin/AdminUserMenu';
import { cn } from '@/lib/utils';

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();
  const pathname = usePathname();
  const wideContent = pathname.startsWith('/admin/reclamos');

  return (
    <div className="min-h-screen bg-slate-100">
      <AdminSidebar />
      <div
        className={cn(
          'min-h-screen pt-14 transition-[padding] duration-200 lg:pt-0',
          collapsed ? 'lg:pl-[68px]' : 'lg:pl-64'
        )}
      >
        <header className="sticky top-0 z-40 hidden items-center justify-end gap-2 bg-slate-100 px-4 py-2.5 lg:flex">
          <AdminReclamoAlertBell className="bg-white shadow-sm ring-1 ring-slate-200" />
          <AdminUserMenu />
        </header>
        <main
          className={cn(
            'mx-auto px-4 py-6 lg:px-8 lg:pb-8 lg:pt-4',
            wideContent ? 'max-w-[1600px]' : 'max-w-6xl'
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AdminReclamoAlertsProvider>
        <AdminLayoutInner>{children}</AdminLayoutInner>
      </AdminReclamoAlertsProvider>
    </SidebarProvider>
  );
}
