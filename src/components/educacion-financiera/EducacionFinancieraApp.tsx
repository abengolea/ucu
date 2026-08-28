'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Calculator,
  Check,
  ClipboardList,
  CreditCard,
  Percent,
  PiggyBank,
  Receipt,
  ScanSearch,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { CourseTemplates } from '@/components/educacion-financiera/CourseTemplates';
import { EducationCalculators } from '@/components/educacion-financiera/EducationCalculators';
import { FinancialRadiography } from '@/components/educacion-financiera/FinancialRadiography';
import {
  EDUCATION_MODULES,
  educationModulePath,
} from '@/lib/educacion-financiera/modules';
import {
  clearRadiography,
  loadRadiography,
  type RadiographyResult,
} from '@/lib/educacion-financiera/radiografia';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'ucu-edu-financiera-v2-completed';
const RADIO_SKIP_KEY = 'ucu-edu-financiera-v2-radio-skip';

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

type AppSection = 'home' | 'curso' | 'calculadoras' | 'radiografia';

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

export function EducacionFinancieraApp({
  initialSection = 'home',
}: {
  initialSection?: AppSection;
}) {
  const router = useRouter();
  const [section, setSection] = useState<AppSection>(initialSection);
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [showRadiography, setShowRadiography] = useState(true);
  const [radiography, setRadiography] = useState<RadiographyResult | null>(null);
  const [calcTool, setCalcTool] = useState<
    RadiographyResult['profile']['calculatorHint'] | null
  >(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const ids = JSON.parse(raw) as number[];
        if (Array.isArray(ids)) setCompleted(new Set(ids));
      }
      const saved = loadRadiography();
      if (saved) {
        setRadiography(saved);
        setShowRadiography(false);
      } else if (localStorage.getItem(RADIO_SKIP_KEY) === '1') {
        setShowRadiography(false);
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

  const skipRadiography = () => {
    setShowRadiography(false);
    try {
      localStorage.setItem(RADIO_SKIP_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  const finishRadiography = (result: RadiographyResult) => {
    setRadiography(result);
    try {
      localStorage.removeItem(RADIO_SKIP_KEY);
    } catch {
      /* ignore */
    }
  };

  const continueAfterRadiography = () => {
    setShowRadiography(false);
  };

  const openModuleById = (moduleId: number) => {
    const mod = EDUCATION_MODULES.find((item) => item.id === moduleId);
    if (mod) router.push(educationModulePath(mod));
  };

  const openCalculator = (tool: RadiographyResult['profile']['calculatorHint']) => {
    setCalcTool(tool);
    setSection('calculadoras');
  };

  const goHome = () => {
    setCalcTool(null);
    setSection('home');
  };

  const suggested = new Set(radiography?.profile.moduleIds ?? []);

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

        {showRadiography ? (
          <div className="mt-8">
            <FinancialRadiography
              existing={null}
              onFinished={finishRadiography}
              onSkip={skipRadiography}
              onContinue={continueAfterRadiography}
              onCleared={() => setRadiography(null)}
              onOpenModule={openModuleById}
              onOpenCalculator={openCalculator}
            />
          </div>
        ) : (
          <>
            {radiography ? (
              <div className="mt-8 rounded-xl border border-ucu-blue/25 bg-ucu-blue/[0.06] px-4 py-4 md:px-5">
                <p className="font-display text-xs font-bold uppercase tracking-[0.16em] text-ucu-blue">
                  Según tu radiografía
                </p>
                <p className="mt-1 font-display text-base font-bold text-[var(--ink)]">
                  {radiography.profile.title}
                </p>
                <p className="mt-1 font-serif text-sm text-[var(--ink-muted)]">
                  Marcamos los módulos sugeridos abajo. Podés abrir tu resultado completo o ir a la
                  calculadora recomendada.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSection('radiografia')}
                    className="ucu-btn-ghost"
                  >
                    Ver resultado
                  </button>
                  <button
                    type="button"
                    onClick={() => openCalculator(radiography.profile.calculatorHint)}
                    className="ucu-btn-secondary"
                  >
                    Calculadora sugerida
                  </button>
                </div>
              </div>
            ) : null}

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
                {EDUCATION_MODULES.map((mod) => {
                  const done = completed.has(mod.id);
                  const isSuggested = suggested.has(mod.id);
                  const Icon = ICONS[mod.icon];

                  return (
                    <li key={mod.id}>
                      <Link
                        href={educationModulePath(mod)}
                        className={cn(
                          'flex w-full items-center gap-3.5 rounded-xl border px-4 py-4 text-left transition',
                          done
                            ? 'border-ucu-green/35 bg-ucu-green/10'
                            : isSuggested
                              ? 'border-ucu-magenta/35 bg-ucu-magenta/[0.06] hover:border-ucu-magenta/50'
                              : 'border-[var(--border)] bg-[var(--surface-raised)] hover:border-ucu-blue/30 hover:shadow-ucu',
                        )}
                      >
                        <span
                          className={cn(
                            'inline-flex shrink-0 rounded-md p-2.5',
                            done
                              ? 'bg-ucu-green/20 text-[#3d6e12]'
                              : isSuggested
                                ? 'bg-ucu-magenta/15 text-ucu-magenta'
                                : 'bg-ucu-blue/10 text-ucu-blue',
                          )}
                        >
                          <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-display text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
                            Módulo {mod.id} · {mod.subtitle}
                            {isSuggested && !done ? ' · Sugerido' : ''}
                          </span>
                          <span className="mt-0.5 block font-display text-base font-bold tracking-tight text-[var(--ink)]">
                            {mod.title}
                          </span>
                          <span className="mt-1 block font-serif text-xs text-[var(--ink-muted)]">
                            {mod.urgency}
                          </span>
                        </span>
                        {done ? (
                          <Check className="h-5 w-5 shrink-0 text-[#3d6e12]" aria-label="Completado" />
                        ) : null}
                      </Link>
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
          {!showRadiography ? (
            <button
              type="button"
              onClick={() => {
                setShowRadiography(true);
                setRadiography(null);
                try {
                  localStorage.removeItem(RADIO_SKIP_KEY);
                  clearRadiography();
                } catch {
                  /* ignore */
                }
              }}
              className="ucu-btn-ghost"
            >
              {radiography ? 'Repetir radiografía' : 'Hacer radiografía'}
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  if (section === 'radiografia') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 lg:px-6">
        <button type="button" onClick={goHome} className="ucu-btn-ghost mb-6">
          ← Volver al inicio
        </button>
        <FinancialRadiography
          existing={radiography}
          onFinished={finishRadiography}
          onSkip={() => setSection('curso')}
          onContinue={() => setSection('curso')}
          onCleared={() => setRadiography(null)}
          onOpenModule={openModuleById}
          onOpenCalculator={openCalculator}
        />
        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" onClick={() => setSection('curso')} className="ucu-btn-secondary">
            Ir al curso
          </button>
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
        <EducationCalculators key={calcTool ?? 'menu'} initialTool={calcTool} />
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
        className="ucu-animate-in ucu-animate-in-delay-1 mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        aria-label="Elegí por dónde empezar"
      >
        <button
          type="button"
          onClick={() => {
            setShowRadiography(true);
            setSection('radiografia');
          }}
          className="ucu-card-interactive ucu-accent-top group flex flex-col p-6 text-left md:p-7"
        >
          <span className="mb-4 inline-flex w-fit rounded-md bg-ucu-magenta/12 p-3 text-ucu-magenta">
            <ScanSearch className="h-6 w-6" strokeWidth={1.75} aria-hidden />
          </span>
          <span className="font-display text-xl font-bold tracking-tight text-[var(--ink)] group-hover:text-ucu-blue">
            Radiografía
          </span>
          <span className="mt-2 flex-1 font-serif text-sm leading-relaxed text-[var(--ink-muted)]">
            {radiography
              ? 'Ya tenés un resultado guardado. Revisalo o volvé a hacerlo.'
              : '14 preguntas sobre hábitos de compra, crédito y tasas. Te armamos un itinerario.'}
          </span>
          <span className="mt-5 font-display text-sm font-semibold text-ucu-magenta">
            {radiography ? 'Ver resultado →' : 'Hacer diagnóstico →'}
          </span>
        </button>

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
            Ocho módulos con plantillas y fuentes oficiales. Foco en presupuesto, tasas, deudas y
            cómo no firmar a ciegas.
          </span>
          <span className="mt-5 font-display text-sm font-semibold text-ucu-magenta">
            Empezar recorrido →
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setCalcTool(null);
            setSection('calculadoras');
          }}
          className="ucu-card-interactive ucu-accent-top group flex flex-col p-6 text-left md:p-7 sm:col-span-2 lg:col-span-1"
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

      <section className="mt-12" aria-labelledby="temas-heading">
        <h2 id="temas-heading" className="font-display text-xl font-bold tracking-tight text-[var(--ink)]">
          Los 8 temas del curso
        </h2>
        <p className="mt-2 font-serif text-sm text-[var(--ink-muted)]">
          Cada módulo es una página pública: se puede leer, compartir y citar sin pasar por la app.
        </p>
        <ol className="mt-5 grid gap-2 sm:grid-cols-2">
          {EDUCATION_MODULES.map((mod) => (
            <li key={mod.id}>
              <Link
                href={educationModulePath(mod)}
                className="block rounded-lg border border-[var(--border)] px-4 py-3 transition hover:border-ucu-blue/40 hover:bg-[var(--surface-muted)]"
              >
                <span className="font-display text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[var(--ink-faint)]">
                  Módulo {mod.id}
                </span>
                <span className="mt-0.5 block font-display text-sm font-bold text-[var(--ink)]">
                  {mod.title}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <p className="mt-8 text-center font-serif text-xs leading-relaxed text-[var(--ink-faint)]">
        Contenido educativo general. No constituye asesoramiento financiero profesional. Consultá
        con un asesor antes de tomar decisiones de inversión.
      </p>
    </div>
  );
}
