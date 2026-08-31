import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  ChevronRight,
  FileText,
  Gavel,
  Megaphone,
  Scale,
  Users,
} from 'lucide-react';
import { PostList } from '@/components/PostCard';
import { SectionHeader } from '@/components/ui/PageHeader';
import {
  CAMPAIGN_CHANGE_ORG_URL,
  CAMPAIGN_SPOTIFY_PLAYLIST,
  campaignActions,
  campaignDemands,
  campaignTestimonials,
} from '@/lib/campaign-planes-ahorro';
import { resolveMediaUrl } from '@/lib/media';
import type { ContentDocument } from '@/types/content';

const actionIcons = [Users, Scale, Gavel, BookOpen, FileText] as const;

type CampaignLandingProps = {
  heroImageUrl: string | null;
  relatedPosts: ContentDocument[];
};

export function CampaignLanding({ heroImageUrl, relatedPosts }: CampaignLandingProps) {
  const heroSrc = heroImageUrl ?? '/api/media/media/2022/09/driving_school-25.jpg';

  return (
    <>
      {/* Hero */}
      <section
        className="relative overflow-hidden bg-ucu-blue text-white"
        aria-labelledby="campaign-hero-title"
      >
        <div className="absolute inset-0" aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={heroSrc}
            alt=""
            className="h-full w-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-black/75 via-ucu-blue/80 to-ucu-blue/60" />
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                'repeating-linear-gradient(-45deg, transparent, transparent 14px, oklch(100% 0 0 / 0.2) 14px, oklch(100% 0 0 / 0.2) 28px)',
            }}
          />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 py-20 lg:px-6 lg:py-28">
          <p className="ucu-animate-in mb-4 inline-flex items-center gap-2 font-display text-xs font-bold uppercase tracking-[0.22em] text-ucu-yellow">
            <Megaphone className="h-4 w-4" strokeWidth={2} aria-hidden />
            Campaña Nacional UCU · Asociación Civil Reg. nº21
          </p>

          <div className="ucu-animate-in ucu-animate-in-delay-1 max-w-3xl border-l-[6px] border-ucu-yellow bg-ucu-yellow/95 px-6 py-5 shadow-lg">
            <h1
              id="campaign-hero-title"
              className="font-display text-3xl font-extrabold leading-tight tracking-tight text-black md:text-5xl"
            >
              «Los planes de ahorro son una trampa»
            </h1>
          </div>

          <p className="ucu-animate-in ucu-animate-in-delay-2 mt-8 max-w-2xl font-serif text-base leading-relaxed text-white/85 md:text-lg">
            Un plan de ahorro automotor no es un crédito: es un sistema de capitalización en
            grupo donde la cuota se mueve con el precio del auto. UCU exige su reforma integral
            y acompaña a ahorristas de todo el país.
          </p>

          <div className="ucu-animate-in ucu-animate-in-delay-3 mt-10 flex flex-wrap gap-4">
            <a
              href={CAMPAIGN_CHANGE_ORG_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md bg-white px-7 py-3.5 font-display text-sm font-bold text-ucu-blue transition hover:bg-white/90"
            >
              Firmar en Change.org
              <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
            </a>
            <Link
              href="/reclamos/nuevo"
              className="ucu-btn-outline inline-flex items-center gap-2"
            >
              Denunciar tu caso
            </Link>
          </div>
        </div>

        <div className="ucu-brand-bar h-1.5 w-full" aria-hidden />
      </section>

      {/* Demands */}
      <section className="bg-[var(--surface)] py-16 lg:py-20" aria-labelledby="demands-title">
        <div className="mx-auto max-w-6xl px-4 lg:px-6">
          <div className="mb-12 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="ucu-section-title mb-2">Exigencias</p>
              <h2 id="demands-title" className="ucu-title max-w-xl">
                Lo que pedimos a las autoridades
              </h2>
            </div>
            <a
              href={CAMPAIGN_CHANGE_ORG_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-2 rounded-lg border-2 border-ucu-blue/20 bg-ucu-blue/5 px-5 py-3 font-display text-sm font-bold text-ucu-blue transition hover:border-ucu-blue/40 hover:bg-ucu-blue/10"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ucu-blue font-display text-xs font-bold text-white">
                C
              </span>
              Petición en Change.org
              <ChevronRight className="h-4 w-4" />
            </a>
          </div>

          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {campaignDemands.map((demand, index) => (
              <li
                key={demand}
                className="group relative flex gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-5 transition hover:border-ucu-blue/30 hover:shadow-md"
              >
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ucu-blue font-display text-lg font-extrabold text-white transition group-hover:bg-ucu-magenta"
                  aria-hidden
                >
                  {index + 1}
                </span>
                <p className="font-serif text-sm leading-relaxed text-[var(--ink-muted)] md:text-[0.9375rem]">
                  {demand}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Actions */}
      <section
        className="border-y border-[var(--border)] bg-ucu-blue py-16 text-white lg:py-20"
        aria-labelledby="actions-title"
      >
        <div className="mx-auto max-w-6xl px-4 lg:px-6">
          <div className="mb-12 max-w-2xl">
            <p className="mb-2 font-display text-xs font-bold uppercase tracking-[0.2em] text-ucu-yellow">
              Acciones concretas en tu defensa
            </p>
            <h2 id="actions-title" className="font-display text-3xl font-bold tracking-tight md:text-4xl">
              Herramientas para ahorristas
            </h2>
            <p className="mt-4 font-serif text-base leading-relaxed text-white/75">
              ¿Tenés problemas con los planes de ahorro? Desde UCU te compartimos una caja de
              herramientas e información completa para que estés bien informado y asesorado.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {campaignActions.map((action, index) => {
              const Icon = actionIcons[index] ?? FileText;
              return (
                <Link
                  key={action.title}
                  href={action.href}
                  className="group flex flex-col rounded-xl border border-white/15 bg-white/8 p-6 backdrop-blur-sm transition hover:border-white/30 hover:bg-white/12"
                >
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-ucu-yellow text-ucu-blue">
                    <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
                  </div>
                  <h3 className="mb-2 font-display text-lg font-bold tracking-tight">
                    {action.title}
                  </h3>
                  <p className="flex-1 font-serif text-sm leading-relaxed text-white/70">
                    {action.description}
                  </p>
                  <span className="mt-5 inline-flex items-center gap-1 font-display text-sm font-semibold text-ucu-yellow transition group-hover:gap-2">
                    {action.cta}
                    <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ + Podcast row */}
      <section className="py-16 lg:py-20">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 lg:grid-cols-2 lg:px-6">
          <div className="flex flex-col justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-8 lg:p-10">
            <p className="ucu-section-title mb-3">Preguntas frecuentes</p>
            <h2 className="font-display text-2xl font-bold tracking-tight md:text-3xl">
              Información práctica para ahorristas
            </h2>
            <p className="mt-4 font-serif text-sm leading-relaxed text-[var(--ink-muted)] md:text-base">
              Contratación, entrega del auto, aumentos de precios, mora y liquidación final.
              Todo lo que necesitás saber en un solo lugar.
            </p>
            <Link
              href="/planes-de-ahorro-son-una-trampa/preguntas-frecuentes"
              className="ucu-btn-primary mt-8 inline-flex w-fit"
            >
              Ver preguntas frecuentes
            </Link>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)]">
            <div className="border-b border-[var(--border)] bg-ucu-magenta/8 px-6 py-4">
              <p className="ucu-section-title">Podcast UCU</p>
              <h2 className="font-display text-xl font-bold tracking-tight">
                Planes de ahorro al detalle
              </h2>
            </div>
            <iframe
              src={CAMPAIGN_SPOTIFY_PLAYLIST}
              title="Playlist Spotify — Planes de ahorro UCU"
              className="h-[352px] w-full border-0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
            />
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section
        className="border-y border-[var(--border)] bg-[var(--surface-muted)] py-16 lg:py-20"
        aria-labelledby="testimonials-title"
      >
        <div className="mx-auto max-w-6xl px-4 lg:px-6">
          <h2 id="testimonials-title" className="ucu-title mb-10 text-center">
            Voces de la campaña
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {campaignTestimonials.map((item, index) => (
              <blockquote
                key={item.author}
                className={`relative rounded-xl p-7 ${
                  index === 1
                    ? 'bg-ucu-blue text-white md:-translate-y-2 md:shadow-xl'
                    : 'border border-[var(--border)] bg-[var(--surface-raised)]'
                }`}
              >
                <span
                  className={`font-display text-5xl leading-none ${
                    index === 1 ? 'text-ucu-yellow/40' : 'text-ucu-blue/15'
                  }`}
                  aria-hidden
                >
                  "
                </span>
                <p
                  className={`mt-2 font-serif text-sm leading-relaxed md:text-base ${
                    index === 1 ? 'text-white/90' : 'text-[var(--ink-muted)]'
                  }`}
                >
                  {item.quote}
                </p>
                <footer
                  className={`mt-5 font-display text-xs font-bold uppercase tracking-wider ${
                    index === 1 ? 'text-ucu-yellow' : 'text-ucu-magenta'
                  }`}
                >
                  {item.author}
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      {/* Related posts */}
      {relatedPosts.length > 0 ? (
        <section className="py-16 lg:py-20">
          <div className="mx-auto max-w-6xl px-4 lg:px-6">
            <SectionHeader
              eyebrow="Noticias"
              title="Publicaciones sobre planes de ahorro"
              href="/categoria/planes-de-ahorros"
            />
            <PostList posts={relatedPosts.slice(0, 6)} />
          </div>
        </section>
      ) : null}

      {/* Final CTA */}
      <section className="relative overflow-hidden bg-ucu-magenta py-16 text-white lg:py-20">
        <div
          className="pointer-events-none absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 50%, white 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
          aria-hidden
        />
        <div className="relative mx-auto max-w-3xl px-4 text-center lg:px-6">
          <h2 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">
            Sumate a la campaña. Defendemos nuestros derechos.
          </h2>
          <p className="mt-4 font-serif text-base leading-relaxed text-white/80">
            Compartí la campaña por tus redes sociales. Los consumidores de nuestro país tenemos
            que impulsar un cambio en el sistema. Basta de injusticias.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <a
              href={CAMPAIGN_CHANGE_ORG_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md bg-white px-8 py-3.5 font-display text-sm font-bold text-ucu-magenta transition hover:bg-white/90"
            >
              Firmar la petición
            </a>
            <Link href="/reclamos/nuevo" className="ucu-btn-outline">
              Contactanos con tu caso
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
