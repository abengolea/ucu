'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import type { EducationModule } from '@/lib/educacion-financiera/modules';

const STORAGE_KEY = 'ucu-edu-financiera-v2-completed';

export function EducationQuiz({
  moduleId,
  quiz,
}: {
  moduleId: number;
  quiz: EducationModule['content']['quiz'];
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const isCorrect = selected === quiz.correct;

  function markComplete() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const ids = raw ? (JSON.parse(raw) as number[]) : [];
      if (!Array.isArray(ids) || ids.includes(moduleId)) return;
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids, moduleId]));
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    setSelected(null);
    setSubmitted(false);
  }, [moduleId]);

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
            if (selected === quiz.correct) markComplete();
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
