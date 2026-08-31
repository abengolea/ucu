'use client';

import { Shield } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { useAdminUser } from '@/components/admin/AdminAuth';
import { ADMIN_ROLE_LABELS } from '@/lib/admin-roles';
import { cn } from '@/lib/utils';

export function AdminUserMenu({ compact = false }: { compact?: boolean }) {
  const user = useAdminUser();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const initial = user.name.charAt(0).toUpperCase();
  const roleLabel = ADMIN_ROLE_LABELS[user.role];

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
        title={`${user.name} · ${roleLabel}`}
        className={cn(
          'flex items-center rounded-full bg-white shadow-sm ring-1 ring-slate-200 transition-colors hover:bg-slate-50',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a5fb4]/40',
          compact ? 'p-0.5' : 'gap-2 py-0.5 pl-0.5 pr-3'
        )}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1a5fb4]/10 text-xs font-bold text-[#1a5fb4]">
          {initial}
        </span>
        {!compact && (
          <span className="min-w-0 text-left">
            <span className="block max-w-[148px] truncate text-sm font-semibold leading-tight text-slate-800">
              {user.name}
            </span>
            <span className="block truncate text-[11px] font-medium leading-tight text-[#2d8f47]">
              {roleLabel}
            </span>
          </span>
        )}
      </button>

      {open ? (
        <div
          id={menuId}
          role="dialog"
          aria-label="Sesión actual"
          className="absolute right-0 top-full z-50 mt-2 w-64 origin-top-right rounded-xl bg-white p-3 shadow-lg ring-1 ring-slate-200"
        >
          <div className="flex items-start gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1a5fb4]/10 text-sm font-bold text-[#1a5fb4]">
              {initial}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-800">{user.name}</p>
              <p className="truncate text-xs text-slate-600">{user.email}</p>
              <p className="mt-1.5 flex items-center gap-1.5">
                <Shield className="h-3 w-3 text-[#2d8f47]" />
                <span className="text-xs font-medium text-[#2d8f47]">{roleLabel}</span>
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
