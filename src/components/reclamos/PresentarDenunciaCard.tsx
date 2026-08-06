import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PresentarDenunciaCard({ className }: { className?: string }) {
  return (
    <article
      className={cn(
        'ucu-card-interactive ucu-accent-top flex h-full flex-col p-7',
        className
      )}
    >
      <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-ucu-magenta/10 text-ucu-magenta">
        <AlertTriangle className="h-6 w-6" strokeWidth={1.75} aria-hidden />
      </div>
      <p className="font-display text-xs font-bold uppercase tracking-[0.16em] text-ucu-magenta">
        Denuncia de consumo
      </p>
      <h2 className="mt-1 font-display text-xl font-bold tracking-tight text-[var(--ink)] md:text-2xl">
        Presentar una denuncia
      </h2>
      <p className="mt-3 flex-1 font-serif text-sm leading-relaxed text-[var(--ink-muted)] sm:text-base">
        Completá el formulario con tus datos, contanos qué pasó y seleccioná las
        empresas denunciadas. Nos llega tu mensaje; si corresponde, te contactamos
        nosotros.
      </p>
      <div className="mt-6">
        <Link href="/reclamos/nuevo" className="ucu-btn-primary">
          Presentar denuncia
        </Link>
      </div>
    </article>
  );
}
