'use client';

import { useState } from 'react';
import { FileText, ShieldCheck } from 'lucide-react';

type InformeCheckoutProps = {
  empresaId: number;
  disponible: boolean;
  precioLabel: string;
  pagosConfigurados: boolean;
};

export function InformeCheckout({
  empresaId,
  disponible,
  precioLabel,
  pagosConfigurados,
}: InformeCheckoutProps) {
  const [showCheckout, setShowCheckout] = useState(false);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/informes/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empresaId, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo iniciar el pago');
      if (!data.initPoint) throw new Error('Mercado Pago no devolvió URL de pago');
      window.location.href = data.initPoint as string;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar el pago');
      setLoading(false);
    }
  }

  return (
    <div className="border-t border-[var(--border)] pt-6">
      {!showCheckout ? (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <div className="mt-0.5 text-ucu-magenta">
              <FileText className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div>
              <p className="font-display text-sm font-bold text-[var(--ink)]">
                ¿Querés el informe oficial?
              </p>
              <p className="mt-1 max-w-md font-serif text-sm text-[var(--ink-muted)]">
                PDF con causas tipificadas, lectura para el consumidor y código verificable
                en ucu.org.ar
                {pagosConfigurados ? ` — ${precioLabel}` : ''}.
              </p>
            </div>
          </div>
          {disponible ? (
            <button
              type="button"
              className="ucu-btn-primary shrink-0"
              onClick={() => setShowCheckout(true)}
            >
              Emitir informe
            </button>
          ) : (
            <p className="font-serif text-sm text-[var(--ink-muted)]">
              {pagosConfigurados
                ? 'Informe no disponible para este resultado.'
                : 'Pagos en configuración. Pronto podrás emitir el informe online.'}
            </p>
          )}
        </div>
      ) : (
        <form onSubmit={startCheckout} className="space-y-4">
          <p className="font-display text-sm font-bold text-[var(--ink)]">
            Te enviamos el PDF a tu email después del pago ({precioLabel})
          </p>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-[var(--ink)]">Email</span>
            <input
              type="email"
              required
              className="field-input w-full max-w-md"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
            />
          </label>
          {error ? (
            <p role="alert" className="font-serif text-sm text-red-700">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={loading} className="ucu-btn-primary disabled:opacity-60">
              {loading ? 'Redirigiendo a Mercado Pago…' : 'Pagar con Mercado Pago'}
            </button>
            <button
              type="button"
              className="ucu-btn-ghost"
              onClick={() => setShowCheckout(false)}
              disabled={loading}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
      <p className="mt-6 flex items-start gap-2 font-serif text-xs leading-relaxed text-[var(--ink-muted)]">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ucu-green" />
        Estadística de reclamos recibidos por UCU. No constituye sentencia ni determina
        responsabilidad legal.
      </p>
    </div>
  );
}
