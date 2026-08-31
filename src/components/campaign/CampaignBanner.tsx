import Link from 'next/link';
import { Megaphone } from 'lucide-react';
import { CAMPAIGN_CHANGE_ORG_URL } from '@/lib/campaign-planes-ahorro';

export function CampaignBanner() {
  return (
    <section
      className="relative overflow-hidden border-y border-ucu-blue/20 bg-ucu-blue text-white"
      aria-labelledby="campaign-banner-title"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(-45deg, transparent, transparent 12px, oklch(100% 0 0 / 0.15) 12px, oklch(100% 0 0 / 0.15) 24px)',
        }}
        aria-hidden
      />
      <div className="relative mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-10 lg:flex-row lg:items-center lg:justify-between lg:px-6 lg:py-12">
        <div className="max-w-2xl">
          <p className="mb-2 inline-flex items-center gap-2 font-display text-xs font-bold uppercase tracking-[0.2em] text-ucu-yellow">
            <Megaphone className="h-4 w-4" strokeWidth={2} aria-hidden />
            Campaña permanente UCU
          </p>
          <h2
            id="campaign-banner-title"
            className="font-display text-2xl font-extrabold leading-tight tracking-tight md:text-3xl"
          >
            Los planes de ahorro son una trampa
          </h2>
          <p className="mt-3 font-serif text-sm leading-relaxed text-white/80 md:text-base">
            Un plan de ahorro automotor no es un crédito: la cuota se mueve con el auto y el
            grupo. UCU exige la reforma integral del sistema.
          </p>
        </div>
        <div className="flex w-full shrink-0 flex-wrap gap-3 lg:w-auto">
          <Link
            href="/planes-de-ahorro-son-una-trampa"
            className="inline-flex items-center justify-center rounded-md bg-white px-6 py-3 font-display text-sm font-semibold text-ucu-blue transition hover:bg-white/90"
          >
            Conocer la campaña
          </Link>
          <a
            href={CAMPAIGN_CHANGE_ORG_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="ucu-btn-outline inline-flex"
          >
            Firmar petición
          </a>
        </div>
      </div>
    </section>
  );
}
