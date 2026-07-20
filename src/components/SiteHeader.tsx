'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { BrandStripe, Logo } from '@/components/Logo';
import type { CategoryDocument } from '@/types/content';
import { cn } from '@/lib/utils';

const mainNav = [
  { href: '/', label: 'Inicio' },
  { href: '/planes-de-ahorro-son-una-trampa', label: 'Campaña' },
  { href: '/posts', label: 'Noticias' },
  { href: '/educacion-financiera', label: 'Finanzas' },
  { href: '/reclamos', label: 'Reclamos' },
  { href: '/observatorio', label: 'Observatorio' },
  { href: '/categorias', label: 'Categorías' },
];

function NavLink({ href, label, onClick }: { href: string; label: string; onClick?: () => void }) {
  const pathname = usePathname();
  const active = href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'relative rounded-md px-3.5 py-2 font-display text-[0.8rem] font-semibold uppercase tracking-wide transition',
        active
          ? 'text-ucu-blue'
          : 'text-[var(--ink)] hover:bg-[var(--surface-muted)] hover:text-ucu-blue',
      )}
    >
      {label}
      {active ? (
        <span className="absolute inset-x-3.5 -bottom-px h-0.5 rounded-full bg-ucu-magenta" aria-hidden />
      ) : null}
    </Link>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-[var(--surface-raised)]">
      <BrandStripe />
      <div className="border-b border-[var(--border)] bg-[var(--surface-raised)]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 lg:px-6">
          <Logo priority />

          <nav className="hidden items-center gap-0.5 md:flex" aria-label="Principal">
            {mainNav.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <a
              href="mailto:info@ucu.org.ar"
              className="hidden rounded-md bg-ucu-blue px-4 py-2 font-display text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-[#004a80] lg:inline-flex"
            >
              Contacto
            </a>
            <button
              type="button"
              className="inline-flex rounded-md border border-[var(--border)] p-2 text-[var(--ink)] transition hover:bg-[var(--surface-muted)] md:hidden"
              aria-expanded={open}
              aria-controls="mobile-nav"
              aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <nav
          id="mobile-nav"
          className={cn(
            'overflow-hidden border-t border-[var(--border)] bg-[var(--surface-raised)] transition-[max-height] duration-300 ease-out md:hidden',
            open ? 'max-h-[28rem]' : 'max-h-0',
          )}
          aria-label="Principal móvil"
        >
          <div className="flex flex-col gap-0.5 px-3 py-3">
            {mainNav.map((item) => (
              <NavLink key={item.href} {...item} onClick={() => setOpen(false)} />
            ))}
            <a
              href="mailto:info@ucu.org.ar"
              className="mt-2 rounded-md bg-ucu-blue px-4 py-3 text-center font-display text-xs font-semibold uppercase tracking-wide text-white"
              onClick={() => setOpen(false)}
            >
              Contacto
            </a>
          </div>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto bg-ucu-nav text-white">
      <BrandStripe />
      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-14 lg:grid-cols-[1.4fr_1fr_1fr] lg:px-6">
        <div>
          <Logo variant="white" href="/" className="mb-5 w-[180px]" />
          <p className="max-w-sm font-serif text-sm leading-7 text-white/70">
            Organización no gubernamental dedicada a la defensa de los derechos de
            consumidores y usuarios en Argentina.
          </p>
        </div>
        <div>
          <p className="mb-4 font-display text-xs font-bold uppercase tracking-[0.2em] text-ucu-yellow">
            Secciones
          </p>
          <ul className="space-y-2.5 font-display text-sm text-white/70">
            {[
              { href: '/posts', label: 'Noticias' },
              { href: '/planes-de-ahorro-son-una-trampa', label: 'Campaña planes de ahorro' },
              { href: '/reclamos', label: 'Reclamos' },
              { href: '/observatorio', label: 'Observatorio' },
              { href: '/categorias', label: 'Categorías' },
              { href: '/categoria/alertas-de-fraude', label: 'Alertas de fraude' },
              { href: '/categoria/acciones-colectivas', label: 'Acciones colectivas' },
            ].map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="transition hover:text-white">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-4 font-display text-xs font-bold uppercase tracking-[0.2em] text-ucu-yellow">
            Contacto
          </p>
          <ul className="space-y-2.5 font-display text-sm text-white/70">
            <li>
              <a href="mailto:info@ucu.org.ar" className="transition hover:text-white">
                info@ucu.org.ar
              </a>
            </li>
            <li>
              <a href="https://www.ucu.org.ar" className="transition hover:text-white">
                www.ucu.org.ar
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-5 text-center font-display text-xs text-white/40">
        © {new Date().getFullYear()} Usuarios y Consumidores Unidos ·{' '}
        <Link href="/admin/login" className="transition hover:text-white/70">
          Admin
        </Link>
      </div>
    </footer>
  );
}

export function CategorySidebar({ categories }: { categories: CategoryDocument[] }) {
  return (
    <aside className="ucu-card overflow-hidden">
      <div className="border-b border-[var(--border)] bg-[var(--surface-muted)] px-5 py-4">
        <h2 className="font-display text-xs font-bold uppercase tracking-[0.16em] text-ucu-blue">
          Categorías
        </h2>
      </div>
      <ul className="max-h-[520px] space-y-0.5 overflow-y-auto p-3 text-sm">
        {categories.map((category) => (
          <li key={category.slug}>
            <Link
              href={`/categoria/${category.slug}`}
              className="block rounded-md px-3 py-2 font-display text-[var(--ink)] transition hover:bg-[var(--surface-muted)] hover:text-ucu-blue"
            >
              {category.name}
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}

export function HeroSection() {
  return (
    <>
      <section className="relative overflow-hidden bg-ucu-nav text-white">
        <BrandStripe />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `
              linear-gradient(135deg, transparent 40%, oklch(52% 0.14 245) 40%, oklch(52% 0.14 245) 40.5%, transparent 40.5%),
              repeating-linear-gradient(90deg, transparent, transparent 79px, oklch(100% 0 0 / 0.03) 79px, oklch(100% 0 0 / 0.03) 80px)
            `,
          }}
          aria-hidden
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 lg:grid-cols-[1.15fr_0.85fr] lg:px-6 lg:py-24">
          <div className="ucu-animate-in">
            <p className="mb-4 font-display text-xs font-bold uppercase tracking-[0.25em] text-ucu-yellow">
              La red de defensa más grande del país
            </p>
            <h1 className="mb-5 font-display text-[clamp(2.25rem,1.5rem+3.5vw,3.75rem)] font-extrabold leading-[1.05] tracking-tight">
              Defendemos tus derechos como consumidor
            </h1>
            <p className="mb-8 max-w-lg font-serif text-base leading-relaxed text-white/75 md:text-lg">
              Noticias, alertas de fraude, acciones colectivas y recursos para que
              conozcas y ejerzas tus derechos en todo el país.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/planes-de-ahorro-son-una-trampa" className="ucu-btn-primary">
                Campaña planes de ahorro
              </Link>
              <Link href="/reclamos" className="ucu-btn-outline">
                Hacer un reclamo
              </Link>
              <Link href="/posts" className="ucu-btn-outline">
                Ver noticias
              </Link>
            </div>
          </div>

          <div className="ucu-animate-in ucu-animate-in-delay-2 hidden lg:block">
            <div className="ucu-accent-top rounded-xl border border-white/10 bg-white/5 p-8 backdrop-blur-[2px]">
              <p className="mb-6 font-display text-xs font-bold uppercase tracking-[0.2em] text-ucu-green">
                ¿Qué podés hacer?
              </p>
              <ul className="space-y-5">
                {[
                  { label: 'Alertas de fraude', href: '/categoria/alertas-de-fraude', color: 'text-ucu-magenta' },
                  { label: 'Planes de ahorro', href: '/planes-de-ahorro-son-una-trampa', color: 'text-ucu-blue' },
                  { label: 'Reclamos online', href: '/reclamos', color: 'text-ucu-green' },
                  { label: 'Observatorio de fallos', href: '/observatorio', color: 'text-ucu-yellow' },
                  { label: 'Acciones colectivas', href: '/categoria/acciones-colectivas', color: 'text-ucu-blue' },
                ].map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`group flex items-center justify-between font-display text-sm font-semibold text-white/90 transition hover:text-white`}
                    >
                      <span className={item.color}>{item.label}</span>
                      <span className="text-white/40 transition group-hover:translate-x-0.5 group-hover:text-white/70">
                        →
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[var(--border)] bg-[var(--surface-raised)] py-12 md:py-14">
        <div className="mx-auto max-w-3xl px-4 text-center lg:px-6">
          <p className="ucu-section-title mb-3">¿Qué te ofrecemos?</p>
          <h2 className="mb-4 font-display text-2xl font-bold tracking-tight text-[var(--ink)] md:text-3xl">
            Buscamos que conozcas tus derechos como consumidor
          </h2>
          <p className="mx-auto max-w-prose font-serif text-[var(--ink-muted)]">
            Somos una ONG dispuesta a ayudarte con información, alertas y acciones
            colectivas en todo el país.
          </p>
        </div>
      </section>
    </>
  );
}
