'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Calculator,
  Check,
  ClipboardList,
  CreditCard,
  ExternalLink,
  Percent,
  PiggyBank,
  Receipt,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { CoursePretest } from '@/components/educacion-financiera/CoursePretest';
import { CourseTemplates } from '@/components/educacion-financiera/CourseTemplates';
import { EducationCalculators } from '@/components/educacion-financiera/EducationCalculators';
import {
  EDUCATION_MODULES,
  type EducationModule,
} from '@/lib/educacion-financiera/modules';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'ucu-edu-financiera-v2-completed';
const PRETEST_KEY = 'ucu-edu-financiera-v2-pretest-done';

const ICONS = {
  clipboard: ClipboardList,
  piggy: PiggyBank,
  'credit-card': CreditCard,
  wallet: Wallet,
  'trending-up': TrendingUp,
  receipt: Receipt,
  percent: Percent,
  alert: AlertTriangle,
} as const;

function ProgressBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5" aria-hidden>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'h-1.5 flex-1 rounded-full transition-colors duration-300',
            i < current ? 'bg-ucu-blue' : i === current ? 'bg-ucu-magenta' : 'bg-[var(--border)]',
          )}
        />
      ))}
    </div>
  );
}

function QuizCard({
  quiz,
  onComplete,
}: {
  quiz: EducationModule['content']['quiz'];
  onComplete: () => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const isCorrect = selected === quiz.correct;

  return (
    <div className="mt-8 rounded-xl border border-ucu-blue/20 bg-ucu-blue/[0.04] p-5 md:p-6">
      <p className="font-display text-xs font-bold uppercase tracking-[0.18em] text-ucu-blue">
        Pregunta
      </p>
      <p className="mt-2 font-serif text-base leading-relaxed text-[var(--ink)]">{quiz.question}</p>

      <div className="mt-4 flex flex-col gap-2" role="radiogroup" aria-label="Opciones">
        {quiz.options.map((opt, i) => {
          let state: 'idle' | 'selected' | 'correct' | 'wrong' = 'idle';
          if (submitted && i === quiz.correct) state = 'correct';
          else if (submitted && i === selected && !isCorrect) state = 'wrong';
          else if (!submitted && i === selected) state = 'selected';

          return (
            <button
              key={opt}
              type="button"
              role="radio"
              aria-checked={selected === i}
              disabled={submitted}
              onClick={() => setSelected(i)}
              className={cn(
                'rounded-lg border px-4 py-3 text-left font-serif text-sm leading-snug transition',
                state === 'idle' &&
                  'border-[var(--border)] bg-[var(--surface-raised)] hover:border-ucu-blue/40',
                state === 'selected' && 'border-ucu-blue bg-ucu-blue/10 text-[var(--ink)]',
                state === 'correct' && 'border-[#5a9a1f] bg-ucu-green/15 text-[#3d6e12]',
                state === 'wrong' && 'border-ucu-magenta/50 bg-ucu-magenta/10 text-[#9a0054]',
                submitted && 'cursor-default',
              )}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {!submitted ? (
        <button
          type="button"
          disabled={selected === null}
          onClick={() => {
            if (selected === null) return;
            setSubmitted(true);
            if (selected === quiz.correct) onComplete();
          }}
          className="ucu-btn-primary mt-4 w-full disabled:cursor-not-allowed disabled:opacity-50"
        >
          Verificar
        </button>
      ) : (
        <div
          className={cn(
            'mt-4 rounded-lg border px-4 py-3 font-serif text-sm leading-relaxed',
            isCorrect
              ? 'border-[#5a9a1f]/40 bg-ucu-green/15 text-[#3d6e12]'
              : 'border-ucu-magenta/30 bg-ucu-magenta/8 text-[#9a0054]',
          )}
          role="status"
        >
          <strong className="font-display">{isCorrect ? '¡Correcto!' : 'No exactamente.'}</strong>{' '}
          {quiz.explanation}
          {!isCorrect ? (
            <button
              type="button"
              className="mt-3 block font-display text-sm font-semibold text-ucu-blue underline-offset-2 hover:underline"
              onClick={() => {
                setSelected(null);
                setSubmitted(false);
              }}
            >
              Intentar de nuevo
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}

function ModuleDetail({
  mod,
  index,
  completed,
  onComplete,
  onBack,
  onNext,
  onOpenCalculators,
}: {
  mod: EducationModule;
  index: number;
  completed: boolean;
  onComplete: () => void;
  onBack: () => void;
  onNext: (() => void) | null;
  onOpenCalculators: () => void;
}) {
  const Icon = ICONS[mod.icon];
  const cta = mod.content.cta;
  const ctaIsTools = cta?.href.startsWith('#calculadoras');

  return (
    <article className="ucu-animate-in">
      <button type="button" onClick={onBack} className="ucu-btn-ghost mb-6">
        ← Volver al recorrido
      </button>

      <p className="font-display text-xs font-bold uppercase tracking-[0.18em] text-[var(--ink-muted)]">
        Tema {mod.id} · {mod.subtitle}
      </p>
      <div className="mt-3 flex items-start gap-3">
        <span className="inline-flex rounded-md bg-ucu-blue/10 p-2.5 text-ucu-blue">
          <Icon className="h-6 w-6" strokeWidth={1.75} aria-hidden />
        </span>
        <div>
          <h2 className="ucu-title">{mod.title}</h2>
          <p className="mt-1 font-display text-sm font-semibold text-ucu-magenta">{mod.urgency}</p>
        </div>
      </div>
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
        {mod.content.sections.map((s) => (
          <section key={s.heading}>
            <h3 className="font-display text-lg font-bold tracking-tight text-[var(--ink)]">
              {s.heading}
            </h3>
            <p className="mt-2 max-w-prose font-serif text-[0.95rem] leading-[1.7] text-[var(--ink-muted)]">
              {s.text}
            </p>
          </section>
        ))}
      </div>

      <section className="mt-8 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-4 md:px-5">
        <h3 className="font-display text-sm font-bold uppercase tracking-wide text-[var(--ink)]">
          Qué hacer ahora
        </h3>
        <ol className="mt-3 list-decimal space-y-2 pl-5 font-serif text-sm leading-relaxed text-[var(--ink-muted)]">
          {mod.content.actions.map((action) => (
            <li key={action}>{action}</li>
          ))}
        </ol>
        {cta ? (
          ctaIsTools ? (
            <button type="button" onClick={onOpenCalculators} className="ucu-btn-primary mt-4">
              {cta.label}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          ) : (
            <Link href={cta.href} className="ucu-btn-primary mt-4">
              {cta.label}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          )
        ) : null}
      </section>

      {mod.content.resources.length > 0 ? (
        <section className="mt-6">
          <h3 className="font-display text-sm font-bold uppercase tracking-wide text-[var(--ink)]">
            Fuentes oficiales
          </h3>
          <ul className="mt-3 space-y-2">
            {mod.content.resources.map((r) => (
              <li key={r.href + r.label}>
                <a
                  href={r.href}
                  target={r.href.startsWith('http') ? '_blank' : undefined}
                  rel={r.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  className="inline-flex items-start gap-2 font-serif text-sm text-ucu-blue underline-offset-2 hover:underline"
                >
                  <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span>
                    {r.label}
                    <span className="text-[var(--ink-faint)]"> · {r.source}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <QuizCard key={mod.id} quiz={mod.content.quiz} onComplete={onComplete} />

      {completed && onNext ? (
        <button type="button" onClick={onNext} className="ucu-btn-primary mt-4 w-full">
          Siguiente tema
          <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
      ) : null}

      {completed && !onNext ? (
        <div className="mt-4 rounded-lg border border-ucu-green/40 bg-ucu-green/10 px-4 py-3 font-serif text-sm text-[#3d6e12]">
          Completaste el recorrido. Probá las calculadoras con tus números reales para cerrar el
          círculo.
        </div>
      ) : null}

      <p className="mt-6 font-display text-xs text-[var(--ink-faint)]">
        Tema {index + 1} de {EDUCATION_MODULES.length}
      </p>
    </article>
  );
}

export function EducacionFinancieraApp() {
  const [section, setSection] = useState<'home' | 'curso' | 'calculadoras'>('home');
  const [currentModule, setCurrentModule] = useState<number | null>(null);
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [showPretest, setShowPretest] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const ids = JSON.parse(raw) as number[];
        if (Array.isArray(ids)) setCompleted(new Set(ids));
      }
      if (localStorage.getItem(PRETEST_KEY) === '1') setShowPretest(false);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...completed]));
  }, [completed, hydrated]);

  const markComplete = (id: number) => {
    setCompleted((prev) => new Set([...prev, id]));
  };

  const finishPretest = () => {
    setShowPretest(false);
    try {
      localStorage.setItem(PRETEST_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  const goHome = () => {
    setCurrentModule(null);
    setSection('home');
  };

  if (section === 'curso' && currentModule !== null) {
    const mod = EDUCATION_MODULES[currentModule];
    const hasNext = currentModule < EDUCATION_MODULES.length - 1;
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 lg:px-6">
        <ModuleDetail
          mod={mod}
          index={currentModule}
          completed={completed.has(mod.id)}
          onComplete={() => markComplete(mod.id)}
          onBack={() => setCurrentModule(null)}
          onOpenCalculators={() => {
            setCurrentModule(null);
            setSection('calculadoras');
          }}
          onNext={
            hasNext && completed.has(mod.id)
              ? () => setCurrentModule(currentModule + 1)
              : null
          }
        />
      </div>
    );
  }

  if (section === 'curso') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 lg:px-6">
        <button type="button" onClick={goHome} className="ucu-btn-ghost mb-6">
          ← Volver al inicio
        </button>

        <p className="ucu-eyebrow mb-2">Curso gratuito · Autoaprendizaje</p>
        <h1 className="ucu-title">Educación financiera</h1>
        <p className="mt-3 max-w-prose font-serif text-base leading-relaxed text-[var(--ink-muted)]">
          Ocho módulos alineados a lineamientos públicos (presupuesto, crédito, productos, inversiones,
          impuestos, tasas de interés y sobreendeudamiento). Casos locales, fuentes oficiales y plantillas.
          Entrá por el tema que te urge.
        </p>

        {showPretest ? (
          <div className="mt-8">
            <CoursePretest onFinished={finishPretest} onSkip={finishPretest} />
          </div>
        ) : (
          <>
            <div className="mt-8">
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <p className="font-display text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
                  {completed.size}/{EDUCATION_MODULES.length} completados
                </p>
                {completed.size === EDUCATION_MODULES.length ? (
                  <p className="font-display text-xs font-bold text-ucu-magenta">¡Recorrido completo!</p>
                ) : null}
              </div>
              <ProgressBar current={completed.size} total={EDUCATION_MODULES.length} />
              <p className="sr-only" aria-live="polite">
                {completed.size} de {EDUCATION_MODULES.length} módulos completados
              </p>

              <ul className="mt-6 flex flex-col gap-2.5">
                {EDUCATION_MODULES.map((m, i) => {
                  const done = completed.has(m.id);
                  const Icon = ICONS[m.icon];

                  return (
                    <li key={m.id}>
                      <button
                        type="button"
                        onClick={() => setCurrentModule(i)}
                        className={cn(
                          'flex w-full items-center gap-3.5 rounded-xl border px-4 py-4 text-left transition',
                          done
                            ? 'border-ucu-green/35 bg-ucu-green/10'
                            : 'border-[var(--border)] bg-[var(--surface-raised)] hover:border-ucu-blue/30 hover:shadow-ucu',
                        )}
                      >
                        <span
                          className={cn(
                            'inline-flex shrink-0 rounded-md p-2.5',
                            done ? 'bg-ucu-green/20 text-[#3d6e12]' : 'bg-ucu-blue/10 text-ucu-blue',
                          )}
                        >
                          <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-display text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
                            Módulo {m.id} · {m.subtitle}
                          </span>
                          <span className="mt-0.5 block font-display text-base font-bold tracking-tight text-[var(--ink)]">
                            {m.title}
                          </span>
                          <span className="mt-1 block font-serif text-xs text-[var(--ink-muted)]">
                            {m.urgency}
                          </span>
                        </span>
                        {done ? (
                          <Check className="h-5 w-5 shrink-0 text-[#3d6e12]" aria-label="Completado" />
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            <CourseTemplates />

            <p className="mt-6 font-serif text-xs text-[var(--ink-faint)]">
              Contenido educativo. Enlazamos recursos de BCRA, CNV y ARCA; verificá siempre la
              información vigente en el sitio oficial.
            </p>
          </>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" onClick={() => setSection('calculadoras')} className="ucu-btn-secondary">
            Ir a calculadoras
          </button>
          {!showPretest ? (
            <button
              type="button"
              onClick={() => {
                setShowPretest(true);
                try {
                  localStorage.removeItem(PRETEST_KEY);
                } catch {
                  /* ignore */
                }
              }}
              className="ucu-btn-ghost"
            >
              Repetir diagnóstico
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  if (section === 'calculadoras') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 lg:px-6">
        <button type="button" onClick={goHome} className="ucu-btn-ghost mb-6">
          ← Volver al inicio
        </button>
        <EducationCalculators />
        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" onClick={() => setSection('curso')} className="ucu-btn-secondary">
            Ir al curso
          </button>
        </div>
        <p className="mt-8 text-center font-serif text-xs leading-relaxed text-[var(--ink-faint)]">
          Contenido educativo general. No constituye asesoramiento financiero profesional. Las tasas
          son ejemplos que vos podés editar.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 lg:px-6">
      <header className="ucu-animate-in relative overflow-hidden rounded-2xl bg-ucu-blue px-6 py-10 text-white md:px-10 md:py-12">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          aria-hidden
          style={{
            backgroundImage:
              'radial-gradient(circle at 85% 15%, var(--ucu-yellow), transparent 45%), radial-gradient(circle at 10% 90%, var(--ucu-magenta), transparent 40%)',
          }}
        />
        <div className="relative">
          <p className="font-display text-xs font-bold uppercase tracking-[0.22em] text-ucu-yellow">
            UCU · Educación financiera
          </p>
          <h1 className="mt-3 text-balance font-display text-[clamp(1.75rem,1.2rem+2vw,2.75rem)] font-bold leading-[1.1] tracking-tight">
            Tu plata, tus reglas.
          </h1>
          <p className="mt-3 max-w-md font-serif text-base leading-relaxed text-white/85">
            Aprendé finanzas personales o calculá antes de firmar. ¿Por dónde querés empezar?
          </p>
        </div>
      </header>

      <nav
        className="ucu-animate-in ucu-animate-in-delay-1 mt-8 grid gap-4 sm:grid-cols-2"
        aria-label="Elegí por dónde empezar"
      >
        <button
          type="button"
          onClick={() => setSection('curso')}
          className="ucu-card-interactive ucu-accent-top group flex flex-col p-6 text-left md:p-7"
        >
          <span className="mb-4 inline-flex w-fit rounded-md bg-ucu-blue/10 p-3 text-ucu-blue">
            <ClipboardList className="h-6 w-6" strokeWidth={1.75} aria-hidden />
          </span>
          <span className="font-display text-xl font-bold tracking-tight text-[var(--ink)] group-hover:text-ucu-blue">
            Curso práctico
          </span>
          <span className="mt-2 flex-1 font-serif text-sm leading-relaxed text-[var(--ink-muted)]">
            Ocho módulos con diagnóstico, plantillas y fuentes oficiales. Foco en plata cotidiana:
            presupuesto, tasas, deudas y cómo no firmar a ciegas.
          </span>
          <span className="mt-5 font-display text-sm font-semibold text-ucu-magenta">
            Empezar recorrido →
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSection('calculadoras')}
          className="ucu-card-interactive ucu-accent-top group flex flex-col p-6 text-left md:p-7"
        >
          <span className="mb-4 inline-flex w-fit rounded-md bg-ucu-yellow/20 p-3 text-[#c48f00]">
            <Calculator className="h-6 w-6" strokeWidth={1.75} aria-hidden />
          </span>
          <span className="font-display text-xl font-bold tracking-tight text-[var(--ink)] group-hover:text-ucu-blue">
            Calculadoras
          </span>
          <span className="mt-2 flex-1 font-serif text-sm leading-relaxed text-[var(--ink-muted)]">
            Pago mínimo de tarjeta, cuotas vs. contado, tasa real e ingreso vs. gastos — con tus
            números.
          </span>
          <span className="mt-5 font-display text-sm font-semibold text-ucu-magenta">
            Abrir herramientas →
          </span>
        </button>
      </nav>

      <p className="mt-8 text-center font-serif text-xs leading-relaxed text-[var(--ink-faint)]">
        Contenido educativo general. No constituye asesoramiento financiero profesional. Consultá
        con un asesor antes de tomar decisiones de inversión.
      </p>
    </div>
  );
}
