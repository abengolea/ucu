'use client';

import { useState } from 'react';
import {
  clearRadiography,
  computeRadiography,
  DIMENSION_META,
  LIKERT_LABELS,
  RADIOGRAPHY_QUESTIONS,
  saveRadiography,
  type RadiographyResult,
} from '@/lib/educacion-financiera/radiografia';
import { cn } from '@/lib/utils';

type Props = {
  existing?: RadiographyResult | null;
  onFinished: (result: RadiographyResult) => void;
  onSkip: () => void;
  onContinue: () => void;
  onCleared?: () => void;
  onOpenModule: (moduleId: number) => void;
  onOpenCalculator: (tool: RadiographyResult['profile']['calculatorHint']) => void;
};

const ZONE_LABEL = {
  ok: 'Bien encaminado',
  watch: 'Atención',
  alert: 'Prioridad',
} as const;

const ZONE_CLASS = {
  ok: 'border-[#5a9a1f]/40 bg-ucu-green/12 text-[#3d6e12]',
  watch: 'border-ucu-yellow/50 bg-ucu-yellow/15 text-[#8a6a00]',
  alert: 'border-ucu-magenta/35 bg-ucu-magenta/8 text-[#9a0054]',
} as const;

export function FinancialRadiography({
  existing,
  onFinished,
  onSkip,
  onContinue,
  onCleared,
  onOpenModule,
  onOpenCalculator,
}: Props) {
  const [step, setStep] = useState<'intro' | 'quiz' | 'result'>(
    existing ? 'result' : 'intro',
  );
  const [consent, setConsent] = useState(false);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>(existing?.answers ?? {});
  const [result, setResult] = useState<RadiographyResult | null>(existing ?? null);

  const q = RADIOGRAPHY_QUESTIONS[index];
  const progress = ((index + (answers[q?.id] !== undefined ? 1 : 0)) / RADIOGRAPHY_QUESTIONS.length) * 100;

  const finish = (finalAnswers: Record<string, number>) => {
    const computed = computeRadiography(finalAnswers);
    try {
      saveRadiography(computed);
    } catch {
      /* ignore */
    }
    setResult(computed);
    setStep('result');
    onFinished(computed);
  };

  const restart = () => {
    try {
      clearRadiography();
    } catch {
      /* ignore */
    }
    onCleared?.();
    setAnswers({});
    setResult(null);
    setConsent(false);
    setIndex(0);
    setStep('intro');
  };

  if (step === 'result' && result) {
    return (
      <section className="ucu-card ucu-accent-top p-5 md:p-7" aria-labelledby="radio-result-title">
        <p className="ucu-section-title mb-2">Tu radiografía</p>
        <h2
          id="radio-result-title"
          className="font-display text-2xl font-bold tracking-tight text-[var(--ink)]"
        >
          {result.profile.title}
        </h2>
        <p className="mt-3 max-w-prose font-serif text-sm leading-relaxed text-[var(--ink-muted)]">
          {result.profile.summary}
        </p>

        <p className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 font-serif text-xs leading-relaxed text-[var(--ink-muted)]">
          Esto <strong className="font-display text-[var(--ink)]">no es un diagnóstico psicológico</strong> ni
          asesoramiento financiero. Es una orientación educativa según lo que declaraste hoy.
        </p>

        <ul className="mt-6 space-y-3">
          {result.dimensions.map((d) => (
            <li
              key={d.id}
              className={cn('rounded-xl border px-4 py-3', ZONE_CLASS[d.zone])}
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-display text-sm font-bold">{DIMENSION_META[d.id].label}</p>
                <p className="font-display text-xs font-semibold uppercase tracking-wide">
                  {ZONE_LABEL[d.zone]} · {d.score}
                </p>
              </div>
              <div
                className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/10"
                aria-hidden
              >
                <div
                  className="h-full rounded-full bg-current opacity-70 transition-all"
                  style={{ width: `${d.score}%` }}
                />
              </div>
              <p className="mt-2 font-serif text-xs leading-relaxed opacity-90">{d.tip}</p>
            </li>
          ))}
        </ul>

        <div className="mt-6">
          <p className="font-display text-sm font-bold text-[var(--ink)]">Itinerario sugerido</p>
          <p className="mt-1 font-serif text-xs text-[var(--ink-muted)]">
            Empezá por estos módulos (podés cambiar el orden cuando quieras).
          </p>
          <ol className="mt-3 flex flex-wrap gap-2">
            {result.profile.moduleIds.map((id, i) => (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => onOpenModule(id)}
                  className="rounded-md border border-ucu-blue/30 bg-ucu-blue/8 px-3 py-1.5 font-display text-xs font-semibold text-ucu-blue transition hover:bg-ucu-blue/15"
                >
                  {i + 1}. Módulo {id}
                </button>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" onClick={onContinue} className="ucu-btn-primary">
            Ver módulos sugeridos
          </button>
          <button
            type="button"
            onClick={() => onOpenCalculator(result.profile.calculatorHint)}
            className="ucu-btn-secondary"
          >
            Abrir calculadora sugerida
          </button>
          <button type="button" onClick={restart} className="ucu-btn-ghost">
            Repetir radiografía
          </button>
        </div>
      </section>
    );
  }

  if (step === 'intro') {
    return (
      <section className="ucu-card ucu-accent-top p-5 md:p-7" aria-labelledby="radio-intro-title">
        <p className="ucu-section-title mb-2">Diagnóstico de hábitos</p>
        <h2
          id="radio-intro-title"
          className="font-display text-2xl font-bold tracking-tight text-[var(--ink)]"
        >
          Radiografía de tus hábitos financieros
        </h2>
        <p className="mt-3 max-w-prose font-serif text-sm leading-relaxed text-[var(--ink-muted)]">
          {RADIOGRAPHY_QUESTIONS.length} preguntas sobre cómo comprás, usás crédito y leés tasas. Al
          final te sugerimos módulos y una calculadora. Tus respuestas quedan solo en este
          navegador.
        </p>

        <ul className="mt-4 space-y-1.5 font-serif text-sm text-[var(--ink-muted)]">
          <li>· No es un test psicológico ni un diagnóstico clínico.</li>
          <li>· No es asesoramiento financiero personalizado.</li>
          <li>· Sirve para orientarte en el curso, nada más.</li>
        </ul>

        <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-1 h-4 w-4 accent-[var(--ucu-blue)]"
          />
          <span className="font-serif text-sm leading-relaxed text-[var(--ink)]">
            Entiendo que esto es solo educativo y acepto continuar.
          </span>
        </label>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={!consent}
            onClick={() => setStep('quiz')}
            className="ucu-btn-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            Empezar
          </button>
          <button type="button" onClick={onSkip} className="ucu-btn-ghost">
            Saltar y ver el curso
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="ucu-card ucu-accent-top p-5 md:p-7" aria-labelledby="radio-quiz-title">
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <p className="ucu-section-title">Pregunta {index + 1} de {RADIOGRAPHY_QUESTIONS.length}</p>
        <p className="font-display text-xs text-[var(--ink-muted)]">{DIMENSION_META[q.dimension].label}</p>
      </div>
      <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-[var(--border)]" aria-hidden>
        <div
          className="h-full rounded-full bg-ucu-blue transition-all duration-300"
          style={{ width: `${Math.max(progress, ((index) / RADIOGRAPHY_QUESTIONS.length) * 100)}%` }}
        />
      </div>

      <h2 id="radio-quiz-title" className="font-display text-lg font-bold tracking-tight text-[var(--ink)] md:text-xl">
        {q.text}
      </h2>
      <p className="mt-2 font-serif text-xs text-[var(--ink-muted)]">
        Elegí la opción que más se acerque a tu realidad reciente.
      </p>

      <div className="mt-5 flex flex-col gap-2" role="radiogroup" aria-label={q.text}>
        {LIKERT_LABELS.map((label, value) => {
          const selected = answers[q.id] === value;
          return (
            <button
              key={label}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => {
                const next = { ...answers, [q.id]: value };
                setAnswers(next);
                if (index < RADIOGRAPHY_QUESTIONS.length - 1) {
                  window.setTimeout(() => setIndex((i) => i + 1), 180);
                } else {
                  window.setTimeout(() => finish(next), 180);
                }
              }}
              className={cn(
                'rounded-lg border px-4 py-3 text-left font-serif text-sm transition',
                selected
                  ? 'border-ucu-blue bg-ucu-blue/10 font-medium text-[var(--ink)]'
                  : 'border-[var(--border)] hover:border-ucu-blue/40',
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        {index > 0 ? (
          <button
            type="button"
            onClick={() => setIndex((i) => i - 1)}
            className="ucu-btn-ghost"
          >
            ← Anterior
          </button>
        ) : null}
        <button type="button" onClick={onSkip} className="ucu-btn-ghost">
          Saltar
        </button>
      </div>
    </section>
  );
}
