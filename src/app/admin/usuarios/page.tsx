'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, KeyRound, Loader2, Pencil, Plus, Trash2, UserCheck, UserX, X } from 'lucide-react';
import { useAdminUser } from '@/components/admin/AdminAuth';
import { RequirePermission } from '@/components/admin/AdminPermissionGuard';
import {
  ADMIN_ROLE_DESCRIPTIONS,
  ADMIN_ROLE_LABELS,
} from '@/lib/admin-roles';
import type { AdminRole, AdminUser, ReclamosWriteScope } from '@/types/admin-users';

const ROLES: AdminRole[] = ['administrador', 'editor', 'moderador', 'operador'];
const SCOPES: { value: ReclamosWriteScope; label: string }[] = [
  { value: 'all', label: 'Todos los reclamos' },
  { value: 'assigned', label: 'Solo asignados' },
];

type FormState = {
  email: string;
  name: string;
  role: AdminRole;
  active: boolean;
  reclamosWriteScope: ReclamosWriteScope;
  password: string;
};

const EMPTY_FORM: FormState = {
  email: '',
  name: '',
  role: 'editor',
  active: true,
  reclamosWriteScope: 'all',
  password: '',
};

export default function AdminUsuariosPage() {
  const currentUser = useAdminUser();
  const canWriteUsers = currentUser.permissions.includes('users:write');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [resettingEmail, setResettingEmail] = useState<string | null>(null);
  const [resetLink, setResetLink] = useState<{
    email: string;
    link: string;
    emailed: boolean;
    warning?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  async function loadUsers() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/users', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cargar usuarios');
      setUsers(data.users || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  function openCreate() {
    setEditingEmail(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
    setError(null);
  }

  function openEdit(user: AdminUser) {
    setEditingEmail(user.email);
    setForm({
      email: user.email,
      name: user.name,
      role: user.role,
      active: user.active,
      reclamosWriteScope: user.reclamosWriteScope,
      password: '',
    });
    setShowForm(true);
    setError(null);
  }

  function closeForm() {
    setShowForm(false);
    setEditingEmail(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const url = editingEmail
        ? `/api/admin/users/${encodeURIComponent(editingEmail)}`
        : '/api/admin/users';
      const method = editingEmail ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          name: form.name,
          role: form.role,
          active: form.active,
          reclamosWriteScope: form.role === 'operador' ? form.reclamosWriteScope : 'all',
          ...(form.password.trim() ? { password: form.password } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar');

      closeForm();
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(email: string) {
    if (!confirm(`¿Eliminar el usuario ${email}?`)) return;

    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(email)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al eliminar');
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar');
    }
  }

  async function handleResetPassword(email: string) {
    setError(null);
    setCopied(false);
    setResettingEmail(email);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(email)}/reset-password`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (typeof data.link === 'string' && data.link) {
        setResetLink({
          email: typeof data.email === 'string' ? data.email : email,
          link: data.link,
          emailed: data.emailed === true,
          warning: res.ok ? undefined : data.error || 'No se pudo enviar el mail',
        });
        if (!res.ok) return;
      } else if (!res.ok) {
        throw new Error(data.error || 'Error al generar el link');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar el link');
    } finally {
      setResettingEmail(null);
    }
  }

  async function copyResetLink() {
    if (!resetLink?.link) return;
    try {
      await navigator.clipboard.writeText(resetLink.link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('No se pudo copiar el link. Seleccionalo manualmente.');
    }
  }

  return (
    <RequirePermission permission="users:read">
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Usuarios</h1>
          <p className="mt-1 text-slate-500">
            Gestioná el acceso al panel con roles y permisos diferenciados.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-[#1a5fb4] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#134a8a]"
        >
          <Plus className="h-4 w-4" />
          Nuevo usuario
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {showForm && (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            {editingEmail ? 'Editar usuario' : 'Nuevo usuario'}
          </h2>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#1a5fb4]"
                placeholder="usuario@ejemplo.com"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Nombre</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#1a5fb4]"
                placeholder="Nombre visible"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Rol</label>
              <select
                value={form.role}
                onChange={(e) => {
                  const role = e.target.value as AdminRole;
                  setForm((f) => ({
                    ...f,
                    role,
                    reclamosWriteScope: role === 'operador' ? f.reclamosWriteScope : 'all',
                  }));
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#1a5fb4]"
              >
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {ADMIN_ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">{ADMIN_ROLE_DESCRIPTIONS[form.role]}</p>
            </div>
            {form.role === 'operador' ? (
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Alcance en reclamos
                </label>
                <select
                  value={form.reclamosWriteScope}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      reclamosWriteScope: e.target.value as ReclamosWriteScope,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#1a5fb4]"
                >
                  {SCOPES.map((scope) => (
                    <option key={scope.value} value={scope.value}>
                      {scope.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {editingEmail ? 'Nueva contraseña (opcional)' : 'Contraseña'}
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#1a5fb4]"
                placeholder={editingEmail ? 'Dejar vacío para no cambiar' : 'Contraseña de ingreso'}
                autoComplete="new-password"
              />
            </div>
            <div className="flex items-end">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                  className="rounded border-slate-300 text-[#1a5fb4] focus:ring-[#1a5fb4]"
                />
                Usuario activo
              </label>
            </div>
            <div className="flex gap-3 sm:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-[#2d8f47] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1f6b31] disabled:opacity-60"
              >
                {saving ? 'Guardando…' : editingEmail ? 'Guardar cambios' : 'Crear usuario'}
              </button>
              <button
                type="button"
                onClick={closeForm}
                className="rounded-lg border border-slate-200 px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ROLES.map((role) => (
          <div key={role} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-800">{ADMIN_ROLE_LABELS[role]}</p>
            <p className="mt-1 text-xs text-slate-500">{ADMIN_ROLE_DESCRIPTIONS[role]}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-[#1a5fb4]" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Usuario</th>
                <th className="px-4 py-3 font-semibold">Rol</th>
                <th className="px-4 py-3 font-semibold">Reclamos</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
                <th className="px-4 py-3 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.email} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{user.name}</p>
                    <p className="text-xs text-slate-500">{user.email}</p>
                    {user.email === currentUser.email && (
                      <span className="mt-1 inline-block text-xs font-medium text-[#1a5fb4]">(vos)</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-[#1a5fb4]">
                      {ADMIN_ROLE_LABELS[user.role]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {user.role === 'operador'
                      ? user.reclamosWriteScope === 'assigned'
                        ? 'Solo asignados'
                        : 'Todos'
                      : '—'}
                    {user.hasPassword ? (
                      <span className="mt-1 block text-slate-400">Con contraseña</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    {user.active ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                        <UserCheck className="h-3.5 w-3.5" />
                        Activo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400">
                        <UserX className="h-3.5 w-3.5" />
                        Inactivo
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {canWriteUsers ? (
                        <button
                          type="button"
                          onClick={() => handleResetPassword(user.email)}
                          disabled={resettingEmail === user.email}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-amber-700 hover:bg-amber-50 disabled:opacity-60"
                        >
                          {resettingEmail === user.email ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <KeyRound className="h-3.5 w-3.5" />
                          )}
                          Resetear
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => openEdit(user)}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[#1a5fb4] hover:bg-blue-50"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Editar
                      </button>
                      {user.email !== currentUser.email && (
                        <button
                          type="button"
                          onClick={() => handleDelete(user.email)}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Eliminar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!users.length && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    No hay usuarios registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-slate-400">
        Los usuarios pueden ingresar con Google (email registrado) o con contraseña individual.
        Los operadores con alcance &quot;Solo asignados&quot; ven todos los reclamos pero editan únicamente
        los que tienen asignados a su email.
      </p>

      {resetLink ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Link de restablecimiento</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {resetLink.emailed ? (
                    <>
                      Se envió un mail a{' '}
                      <span className="font-medium text-slate-700">{resetLink.email}</span> con el
                      link de Firebase Authentication. También podés copiarlo acá.
                    </>
                  ) : (
                    <>
                      No se pudo enviar el mail a{' '}
                      <span className="font-medium text-slate-700">{resetLink.email}</span>. Copiá
                      el link y compartilo manualmente.
                    </>
                  )}
                </p>
                {resetLink.warning ? (
                  <p className="mt-2 text-sm text-amber-700">{resetLink.warning}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => {
                  setResetLink(null);
                  setCopied(false);
                }}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="break-all font-mono text-xs leading-relaxed text-slate-700">
                {resetLink.link}
              </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={copyResetLink}
                className="inline-flex items-center gap-2 rounded-lg bg-[#1a5fb4] px-4 py-2 text-sm font-semibold text-white hover:bg-[#134a8a]"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copiado' : 'Copiar link'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setResetLink(null);
                  setCopied(false);
                }}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
    </RequirePermission>
  );
}
