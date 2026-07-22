'use client';

import { Download } from 'lucide-react';
import { COURSE_TEMPLATES } from '@/lib/educacion-financiera/course-extras';

function downloadTemplate(filename: string, body: string) {
  const blob = new Blob([body], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function CourseTemplates() {
  return (
    <section aria-labelledby="templates-heading" className="mt-10">
      <h2 id="templates-heading" className="font-display text-xl font-bold tracking-tight text-[var(--ink)]">
        Plantillas descargables
      </h2>
      <p className="mt-1 font-serif text-sm text-[var(--ink-muted)]">
        Para imprimir o completar en el celular. No reemplazan asesoramiento profesional.
      </p>
      <ul className="mt-5 grid gap-3 sm:grid-cols-3">
        {COURSE_TEMPLATES.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => downloadTemplate(t.filename, t.body)}
              className="ucu-card-interactive flex h-full w-full flex-col p-4 text-left"
            >
              <span className="font-display text-sm font-bold text-[var(--ink)]">{t.title}</span>
              <span className="mt-1 flex-1 font-serif text-xs leading-snug text-[var(--ink-muted)]">
                {t.description}
              </span>
              <span className="mt-3 inline-flex items-center gap-1.5 font-display text-xs font-semibold text-ucu-magenta">
                <Download className="h-3.5 w-3.5" aria-hidden />
                Descargar
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
