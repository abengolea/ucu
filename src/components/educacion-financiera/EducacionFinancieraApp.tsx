'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Check,
  ClipboardList,
  Coins,
  CreditCard,
  Lock,
  Shield,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { EducationCalculators } from '@/components/educacion-financiera/EducationCalculators';
import {
  EDUCATION_MODULES,
  GLOSSARY,
  type EducationModule,
} from '@/lib/educacion-financiera/modules';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'ucu-edu-financiera-completed';

const ICONS = {
  coins: Coins,
  clipboard: ClipboardList,
  shield: Shield,
  'trending-down': TrendingDown,
  'credit-card': CreditCard,
  'trending-up': TrendingUp,
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
}: {
  mod: EducationModule;
  index: number;
  completed: boolean;
  onComplete: () => void;
  onBack: () => void;
  onNext: (() => void) | null;
}) {
  const Icon = ICONS[mod.icon];

  return (
    <article className="ucu-animate-in">
      <button type="button" onClick={onBack} className="ucu-btn-ghost mb-6">
        ← Volver al recorrido
      </button>

      <p className="font-display text-xs font-bold uppercase tracking-[0.18em] text-[var(--ink-muted)]">
        Paso {mod.id} · {mod.subtitle}
      </p>
      <div className="mt-3 flex items-start gap-3">
        <span className="inline-flex rounded-md bg-ucu-blue/10 p-2.5 text-ucu-blue">
          <Icon className="h-6 w-6" strokeWidth={1.75} aria-hidden />
        </span>
        <h2 className="ucu-title">{mod.title}</h2>
      </div>
      <p className="mt-4 max-w-prose font-serif text-base italic leading-relaxed text-[var(--ink-muted)]">
        {mod.content.intro}
      </p>

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

      <QuizCard
        key={mod.id}
        quiz={mod.content.quiz}
        onComplete={onComplete}
      />

      {completed && onNext ? (
        <button type="button" onClick={onNext} className="ucu-btn-primary mt-4 w-full">
          Siguiente paso
          <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
      ) : null}

      {completed && !onNext ? (
        <div className="mt-4 rounded-lg border border-ucu-green/40 bg-ucu-green/10 px-4 py-3 font-serif text-sm text-[#3d6e12]">
          Completaste el recorrido. Usá las calculadoras o{' '}
          <Link href="/reclamos" className="font-display font-semibold text-ucu-blue underline-offset-2 hover:underline">
            iniciá un reclamo
          </Link>{' '}
          si una empresa te está perjudicando.
        </div>
      ) : null}

      <p className="mt-6 font-display text-xs text-[var(--ink-faint)]">
        Paso {index + 1} de {EDUCATION_MODULES.length}
      </p>
    </article>
  );
}

export function EducacionFinancieraApp() {
  const [currentModule, setCurrentModule] = useState<number | null>(null);
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const ids = JSON.parse(raw) as number[];
        if (Array.isArray(ids)) setCompleted(new Set(ids));
      }
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

  if (currentModule !== null) {
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
          onNext={
            hasNext && completed.has(mod.id)
              ? () => setCurrentModule(currentModule + 1)
              : null
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 lg:px-6">
      {/* Hero — brand first, one composition */}
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
            Aprendé finanzas personales paso a paso, con la mirada de consumidores argentinos — y
            calculá antes de firmar.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="#recorrido" className="ucu-btn-outline">
              Empezar recorrido
            </a>
            <a href="#calculadoras" className="rounded-md bg-white px-6 py-3 font-display text-sm font-semibold text-ucu-blue transition hover:bg-white/90">
              Ir a calculadoras
            </a>
          </div>
        </div>
      </header>

      <div id="recorrido" className="ucu-animate-in ucu-animate-in-delay-1 mt-10 scroll-mt-24">
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
            const locked = i > 0 && !completed.has(EDUCATION_MODULES[i - 1].id) && !done;
            const Icon = ICONS[m.icon];

            return (
              <li key={m.id}>
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => !locked && setCurrentModule(i)}
                  className={cn(
                    'flex w-full items-center gap-3.5 rounded-xl border px-4 py-4 text-left transition',
                    done
                      ? 'border-ucu-green/35 bg-ucu-green/10'
                      : 'border-[var(--border)] bg-[var(--surface-raised)] hover:border-ucu-blue/30 hover:shadow-ucu',
                    locked && 'cursor-not-allowed opacity-45 hover:border-[var(--border)] hover:shadow-none',
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
                      Paso {m.id} · {m.subtitle}
                    </span>
                    <span className="mt-0.5 block font-display text-base font-bold tracking-tight text-[var(--ink)]">
                      {m.title}
                    </span>
                  </span>
                  {done ? (
                    <Check className="h-5 w-5 shrink-0 text-[#3d6e12]" aria-label="Completado" />
                  ) : null}
                  {locked ? (
                    <Lock className="h-4 w-4 shrink-0 text-[var(--ink-faint)]" aria-label="Bloqueado" />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div id="calculadoras" className="ucu-animate-in ucu-animate-in-delay-2 mt-10 scroll-mt-24">
        <EducationCalculators />
      </div>

      <section className="mt-10" aria-labelledby="glossary-heading">
        <h2 id="glossary-heading" className="font-display text-xl font-bold tracking-tight text-[var(--ink)]">
          Glosario rápido
        </h2>
        <p className="mt-1 font-serif text-sm text-[var(--ink-muted)]">
          Términos que aparecen en resúmenes de tarjeta, créditos y apps de inversión.
        </p>
        <dl className="mt-5 divide-y divide-[var(--border)] border-y border-[var(--border)]">
          {GLOSSARY.map((item) => (
            <div key={item.term} className="grid gap-1 py-3.5 sm:grid-cols-[7rem_1fr] sm:gap-4">
              <dt className="font-display text-sm font-bold text-ucu-blue">{item.term}</dt>
              <dd className="font-serif text-sm leading-relaxed text-[var(--ink-muted)]">
                {item.definition}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-10 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-6">
        <h2 className="font-display text-lg font-bold text-[var(--ink)]">¿Te están perjudicando?</h2>
        <p className="mt-2 font-serif text-sm leading-relaxed text-[var(--ink-muted)]">
          Educación es el primer paso. Si un banco, comercio o empresa te cobró mal, no te dejan
          cancelar o te encerró en un plan de ahorro, UCU puede ayudarte con un reclamo.
        </p>
        <Link href="/reclamos" className="ucu-btn-primary mt-5">
          Ir a reclamos
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </section>

      <p className="mt-8 text-center font-serif text-xs leading-relaxed text-[var(--ink-faint)]">
        Contenido educativo general. No constituye asesoramiento financiero profesional. Consultá
        con un asesor antes de tomar decisiones de inversión. Las tasas de las calculadoras son
        ejemplos que vos podés editar.
      </p>
    </div>
  );
}
