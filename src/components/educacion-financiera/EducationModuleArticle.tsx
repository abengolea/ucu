import Link from 'next/link';
import { ArrowRight, ExternalLink } from 'lucide-react';
import { EducationQuiz } from '@/components/educacion-financiera/EducationQuiz';
import {
  EDUCATION_MODULES,
  type EducationModule,
} from '@/lib/educacion-financiera/modules';

export function EducationModuleArticle({
  mod,
  nextHref,
  nextTitle,
}: {
  mod: EducationModule;
  nextHref?: string | null;
  nextTitle?: string | null;
}) {
  const cta = mod.content.cta;

  return (
    <article>
      <p className="font-display text-xs font-bold uppercase tracking-[0.18em] text-[var(--ink-muted)]">
        Tema {mod.id} · {mod.subtitle}
      </p>
      <h1 className="ucu-title mt-3">{mod.title}</h1>
      <p className="mt-1 font-display text-sm font-semibold text-ucu-magenta">{mod.urgency}</p>
      <p className="mt-4 max-w-prose font-serif text-base leading-relaxed text-[var(--ink-muted)]">
        {mod.content.intro}
      </p>

      <aside className="mt-6 rounded-xl border border-ucu-yellow/40 bg-ucu-yellow/10 px-4 py-4 md:px-5">
        <p className="font-display text-xs font-bold uppercase tracking-[0.16em] text-[#c48f00]">
          {mod.content.caseStudy.title}
        </p>
        <p className="mt-2 font-serif text-sm leading-relaxed text-[var(--ink)]">
          {mod.content.caseStudy.text}
        </p>
      </aside>

      <div className="mt-8 space-y-7">
        {mod.content.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="font-display text-lg font-bold tracking-tight text-[var(--ink)]">
              {section.heading}
            </h2>
            <p className="mt-2 max-w-prose font-serif text-[0.95rem] leading-[1.7] text-[var(--ink-muted)]">
              {section.text}
            </p>
          </section>
        ))}
      </div>

      <section className="mt-8 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-4 md:px-5">
        <h2 className="font-display text-sm font-bold uppercase tracking-wide text-[var(--ink)]">
          Qué hacer ahora
        </h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 font-serif text-sm leading-relaxed text-[var(--ink-muted)]">
          {mod.content.actions.map((action) => (
            <li key={action}>{action}</li>
          ))}
        </ol>
        {cta ? (
          <Link href={cta.href} className="ucu-btn-primary mt-4">
            {cta.label}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        ) : null}
      </section>

      {mod.content.resources.length > 0 ? (
        <section className="mt-6">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-[var(--ink)]">
            Fuentes oficiales
          </h2>
          <ul className="mt-3 space-y-2">
            {mod.content.resources.map((resource) => (
              <li key={resource.href + resource.label}>
                <a
                  href={resource.href}
                  target={resource.href.startsWith('http') ? '_blank' : undefined}
                  rel={resource.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  className="inline-flex items-start gap-2 font-serif text-sm text-ucu-blue underline-offset-2 hover:underline"
                >
                  <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span>
                    {resource.label}
                    <span className="text-[var(--ink-faint)]"> · {resource.source}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <EducationQuiz moduleId={mod.id} quiz={mod.content.quiz} />

      {nextHref ? (
        <Link href={nextHref} className="ucu-btn-primary mt-4 w-full">
          Siguiente: {nextTitle}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      ) : (
        <p className="mt-4 rounded-lg border border-ucu-green/40 bg-ucu-green/10 px-4 py-3 font-serif text-sm text-[#3d6e12]">
          Completaste el recorrido. Probá las calculadoras con tus números reales para cerrar el
          círculo.
        </p>
      )}

      <p className="mt-6 font-display text-xs text-[var(--ink-faint)]">
        Tema {mod.id} de {EDUCATION_MODULES.length}
      </p>
    </article>
  );
}
