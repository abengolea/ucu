'use client';

import { useMemo, useState } from 'react';
import { PRETEST_QUESTIONS } from '@/lib/educacion-financiera/course-extras';
import { cn } from '@/lib/utils';

type Props = {
  onFinished: (score: number, total: number) => void;
  onSkip: () => void;
};

export function CoursePretest({ onFinished, onSkip }: Props) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const score = useMemo(() => {
    return PRETEST_QUESTIONS.reduce((acc, q) => {
      return acc + (answers[q.id] === q.correct ? 1 : 0);
    }, 0);
  }, [answers]);

  const allAnswered = PRETEST_QUESTIONS.every((q) => answers[q.id] !== undefined);

  return (
    <section className="ucu-card ucu-accent-top p-5 md:p-7" aria-labelledby="pretest-title">
      <p className="ucu-section-title mb-2">Diagnóstico</p>
      <h2 id="pretest-title" className="font-display text-2xl font-bold tracking-tight text-[var(--ink)]">
        ¿Por dónde arrancar?
      </h2>
      <p className="mt-2 max-w-prose font-serif text-sm leading-relaxed text-[var(--ink-muted)]">
        Seis preguntas rápidas (sin nota). Sirven para ver tu punto de partida; después entrá a
        cualquier módulo.
      </p>

      <ol className="mt-6 space-y-6">
        {PRETEST_QUESTIONS.map((q, idx) => (
          <li key={q.id}>
            <p className="font-display text-sm font-bold text-[var(--ink)]">
              {idx + 1}. {q.question}
            </p>
            <div className="mt-2 flex flex-col gap-2" role="radiogroup" aria-label={q.question}>
              {q.options.map((opt, i) => {
                const selected = answers[q.id] === i;
                let state: 'idle' | 'selected' | 'correct' | 'wrong' = 'idle';
                if (submitted && i === q.correct) state = 'correct';
                else if (submitted && selected && i !== q.correct) state = 'wrong';
                else if (!submitted && selected) state = 'selected';

                return (
                  <button
                    key={opt}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={submitted}
                    onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: i }))}
                    className={cn(
                      'rounded-lg border px-3 py-2.5 text-left font-serif text-sm transition',
                      state === 'idle' && 'border-[var(--border)] hover:border-ucu-blue/40',
                      state === 'selected' && 'border-ucu-blue bg-ucu-blue/10',
                      state === 'correct' && 'border-[#5a9a1f] bg-ucu-green/15 text-[#3d6e12]',
                      state === 'wrong' && 'border-ucu-magenta/40 bg-ucu-magenta/8 text-[#9a0054]',
                    )}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
            {submitted ? (
              <p className="mt-2 font-serif text-xs leading-relaxed text-[var(--ink-muted)]">{q.tip}</p>
            ) : null}
          </li>
        ))}
      </ol>

      {!submitted ? (
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={!allAnswered}
            onClick={() => setSubmitted(true)}
            className="ucu-btn-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            Ver resultado
          </button>
          <button type="button" onClick={onSkip} className="ucu-btn-ghost">
            Saltar diagnóstico
          </button>
        </div>
      ) : (
        <div className="mt-6 rounded-lg border border-ucu-blue/25 bg-ucu-blue/8 px-4 py-3">
          <p className="font-display font-bold text-ucu-blue">
            Resultado: {score} de {PRETEST_QUESTIONS.length}
          </p>
          <p className="mt-1 font-serif text-sm text-[var(--ink-muted)]">
            {score <= 2
              ? 'Te conviene empezar por presupuesto y deuda.'
              : score <= 4
                ? 'Buen piso: reforzá el módulo donde fallaste y pasá a calculadoras.'
                : 'Muy bien: profundizá en tasas, sobreendeudamiento o inversiones según tu interés.'}
          </p>
          <button
            type="button"
            onClick={() => onFinished(score, PRETEST_QUESTIONS.length)}
            className="ucu-btn-primary mt-4"
          >
            Ir al listado de temas
          </button>
        </div>
      )}
    </section>
  );
}
