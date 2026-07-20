'use client';

import { useMemo, useState } from 'react';
import {
  calcCardMinimumPayoff,
  calcCashVsInstallments,
  calcRealRate,
  calcSavingsCapacity,
  formatARS,
  formatPct,
} from '@/lib/educacion-financiera/calculators';
import { cn } from '@/lib/utils';

type ToolId = 'ahorro' | 'tarjeta' | 'cuotas' | 'tasa-real';

const TOOLS: {
  id: ToolId;
  label: string;
  need: string;
  blurb: string;
}[] = [
  {
    id: 'ahorro',
    label: 'Capacidad de ahorro',
    need: '¿Cuánto puedo ahorrar?',
    blurb: 'Ingreso vs. gastos y fondo de emergencia',
  },
  {
    id: 'tarjeta',
    label: 'Pago mínimo',
    need: '¿Qué pasa si pago el mínimo?',
    blurb: 'Intereses de la tarjeta si no cancelás el total',
  },
  {
    id: 'cuotas',
    label: 'Cuotas vs. contado',
    need: '¿Cuotas o pagar de contado?',
    blurb: 'Compará descuento de contado contra cuotas',
  },
  {
    id: 'tasa-real',
    label: 'Tasa real',
    need: '¿Mi plazo fijo me gana a la inflación?',
    blurb: 'Tasa nominal vs. inflación estimada',
  },
];

function Field({
  label,
  value,
  onChange,
  placeholder,
  suffix,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  suffix?: string;
}) {
  return (
    <label className="block min-w-0 flex-1">
      <span className="mb-1.5 block font-display text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
        {label}
      </span>
      <div className="relative">
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn('field-input', suffix && 'pr-10')}
        />
        {suffix ? (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-[var(--ink-faint)]">
            {suffix}
          </span>
        ) : null}
      </div>
    </label>
  );
}

function ResultBox({
  tone,
  title,
  children,
}: {
  tone: 'ok' | 'bad' | 'info';
  title: string;
  children: React.ReactNode;
}) {
  const styles =
    tone === 'ok'
      ? 'border-ucu-green/40 bg-ucu-green/10 text-[#3d6e12]'
      : tone === 'bad'
        ? 'border-ucu-magenta/30 bg-ucu-magenta/8 text-[#9a0054]'
        : 'border-ucu-blue/25 bg-ucu-blue/8 text-ucu-blue';

  return (
    <div className={cn('mt-4 rounded-lg border px-4 py-3.5 text-sm leading-relaxed', styles)}>
      <p className="font-display font-bold">{title}</p>
      <div className="mt-1.5 space-y-1 font-serif text-[0.95em] opacity-95">{children}</div>
    </div>
  );
}

function SavingsCalc() {
  const [income, setIncome] = useState('500000');
  const [expenses, setExpenses] = useState('400000');
  const result = useMemo(() => {
    const i = Number(income);
    const e = Number(expenses);
    if (!income || !expenses || Number.isNaN(i) || Number.isNaN(e)) return null;
    return calcSavingsCapacity(i, e);
  }, [income, expenses]);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Field label="Ingreso mensual $" value={income} onChange={setIncome} placeholder="500000" />
        <Field label="Gastos mensuales $" value={expenses} onChange={setExpenses} placeholder="400000" />
      </div>
      {result ? (
        <ResultBox
          tone={result.capacity > 0 ? 'ok' : result.capacity < 0 ? 'bad' : 'info'}
          title={`Capacidad de ahorro: $${formatARS(result.capacity)}/mes`}
        >
          {result.capacity > 0 ? (
            <>
              <p>
                Eso es un {formatPct(result.savingsRate, 0)} de tu ingreso.
                {result.savingsRate >= 15
                  ? ' Superás el 15% recomendado.'
                  : ' Intentá llegar al 15% ajustando gastos variables.'}
              </p>
              <p>Fondo de emergencia (3 meses): ${formatARS(result.emergencyFund)}</p>
              {result.monthsToFund != null ? (
                <p>Tiempo estimado para armarlo: {result.monthsToFund} meses</p>
              ) : null}
            </>
          ) : null}
          {result.capacity === 0 ? <p>Estás justo. Buscá reducir al menos un gasto variable.</p> : null}
          {result.capacity < 0 ? (
            <p>Gastás más de lo que ganás. Es urgente revisar fijos y variables.</p>
          ) : null}
        </ResultBox>
      ) : null}
    </div>
  );
}

function CardMinCalc() {
  const [balance, setBalance] = useState('100000');
  const [rateInput, setRateInput] = useState('8');
  const [rateMode, setRateMode] = useState<'mensual' | 'anual'>('mensual');
  const [minPct, setMinPct] = useState('5');

  const monthlyRate = useMemo(() => {
    const raw = Number(rateInput);
    if (!rateInput || Number.isNaN(raw)) return null;
    return rateMode === 'anual' ? raw / 12 : raw;
  }, [rateInput, rateMode]);

  const result = useMemo(() => {
    const b = Number(balance);
    const m = Number(minPct);
    if (!balance || monthlyRate == null || !minPct || Number.isNaN(b) || Number.isNaN(m)) {
      return null;
    }
    return calcCardMinimumPayoff(b, monthlyRate, m);
  }, [balance, monthlyRate, minPct]);

  const fullPayInterest = useMemo(() => {
    const b = Number(balance);
    if (!balance || monthlyRate == null || Number.isNaN(b) || b <= 0) return null;
    return b * (monthlyRate / 100);
  }, [balance, monthlyRate]);

  return (
    <div>
      <p className="mb-4 font-serif text-sm leading-relaxed text-[var(--ink-muted)]">
        Completá con los datos de tu <strong className="font-semibold text-[var(--ink)]">resumen de
        tarjeta</strong> (papel o app del banco). Los números por defecto son un ejemplo — no una
        cotización.
      </p>

      <div className="mb-4 rounded-lg border border-ucu-blue/20 bg-ucu-blue/[0.04] px-4 py-3 font-serif text-sm leading-relaxed text-[var(--ink-muted)]">
        <p className="font-display text-xs font-bold uppercase tracking-wide text-ucu-blue">
          ¿Dónde veo el interés?
        </p>
        <p className="mt-1.5">
          En el resumen suele aparecer como <strong className="font-semibold text-[var(--ink)]">tasa de
          financiación</strong>, <strong className="font-semibold text-[var(--ink)]">interés
          compensatorio</strong> o <strong className="font-semibold text-[var(--ink)]">TNA / TEA</strong>.
          Si te dan la tasa <em>anual</em> (TNA), elegí “Anual (TNA)” abajo y la convertimos a mensual
          (÷ 12). Si ya figura el % <em>mensual</em>, usá “Mensual”.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field
          label="Saldo adeudado $"
          value={balance}
          onChange={setBalance}
          placeholder="100000"
        />
        <div className="min-w-0 flex-1 sm:col-span-1">
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
            <span className="font-display text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
              Interés que cobra el banco
            </span>
            <div className="flex rounded-md border border-[var(--border)] p-0.5" role="group" aria-label="Tipo de tasa">
              <button
                type="button"
                onClick={() => setRateMode('mensual')}
                className={cn(
                  'rounded px-2 py-0.5 font-display text-[0.65rem] font-semibold transition',
                  rateMode === 'mensual'
                    ? 'bg-ucu-blue text-white'
                    : 'text-[var(--ink-muted)] hover:text-[var(--ink)]',
                )}
              >
                Mensual
              </button>
              <button
                type="button"
                onClick={() => setRateMode('anual')}
                className={cn(
                  'rounded px-2 py-0.5 font-display text-[0.65rem] font-semibold transition',
                  rateMode === 'anual'
                    ? 'bg-ucu-blue text-white'
                    : 'text-[var(--ink-muted)] hover:text-[var(--ink)]',
                )}
              >
                Anual (TNA)
              </button>
            </div>
          </div>
          <div className="relative">
            <input
              type="number"
              inputMode="decimal"
              value={rateInput}
              onChange={(e) => setRateInput(e.target.value)}
              placeholder={rateMode === 'anual' ? '96' : '8'}
              className="field-input pr-10"
              aria-label={rateMode === 'anual' ? 'Tasa nominal anual' : 'Tasa de interés mensual'}
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-[var(--ink-faint)]">
              %
            </span>
          </div>
          {monthlyRate != null && rateMode === 'anual' ? (
            <p className="mt-1.5 font-serif text-xs text-[var(--ink-muted)]">
              Equivale a ~{monthlyRate.toLocaleString('es-AR', { maximumFractionDigits: 2 })}% mensual
              para esta simulación.
            </p>
          ) : (
            <p className="mt-1.5 font-serif text-xs text-[var(--ink-muted)]">
              Buscalo en el detalle de tasas del resumen.
            </p>
          )}
        </div>
        <Field label="Pago mínimo" value={minPct} onChange={setMinPct} placeholder="5" suffix="%" />
      </div>
      {result && monthlyRate != null ? (
        <ResultBox
          tone={
            result.paymentBelowInterest || result.totalInterest > Number(balance) * 0.5
              ? 'bad'
              : 'info'
          }
          title={
            result.paymentBelowInterest
              ? 'Con estos números la deuda no baja'
              : result.capped
                ? 'En 15 años todavía deberías plata'
                : `Lo cancelás en ${result.months} meses`
          }
        >
          {result.paymentBelowInterest ? (
            <p>
              El pago mínimo ({minPct}%) es menor o igual al interés mensual (
              {monthlyRate.toLocaleString('es-AR', { maximumFractionDigits: 2 })}%). Cada mes la deuda
              crece aunque pagues. La única salida es pagar más que los intereses — idealmente el
              total.
            </p>
          ) : (
            <>
              <p>
                Total pagado: <strong>${formatARS(result.totalPaid)}</strong>
              </p>
              <p>
                Solo en intereses: <strong>${formatARS(result.totalInterest)}</strong>
              </p>
            </>
          )}
          {fullPayInterest != null ? (
            <p className="pt-1">
              Si pagás el total este mes, el interés de un mes sería ~$
              {formatARS(fullPayInterest)}. La diferencia con el mínimo es el costo de postergar.
            </p>
          ) : null}
        </ResultBox>
      ) : null}
    </div>
  );
}

function InstallmentsCalc() {
  const [price, setPrice] = useState('200000');
  const [discount, setDiscount] = useState('15');
  const [cuotas, setCuotas] = useState('12');
  const [interest, setInterest] = useState('0');

  const result = useMemo(() => {
    const p = Number(price);
    const d = Number(discount);
    const c = Number(cuotas);
    const i = Number(interest);
    if (!price || !cuotas || [p, d, c, i].some(Number.isNaN)) return null;
    return calcCashVsInstallments(p, d, c, i);
  }, [price, discount, cuotas, interest]);

  return (
    <div>
      <p className="mb-4 font-serif text-sm leading-relaxed text-[var(--ink-muted)]">
        Compará el precio de lista con descuento de contado frente a las cuotas. Si las cuotas
        &quot;sin interés&quot; tienen el mismo precio que el contado sin descuento, el interés ya
        está metido en el precio.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Precio de lista $" value={price} onChange={setPrice} placeholder="200000" />
        <Field
          label="Descuento de contado"
          value={discount}
          onChange={setDiscount}
          placeholder="15"
          suffix="%"
        />
        <Field label="Cantidad de cuotas" value={cuotas} onChange={setCuotas} placeholder="12" />
        <Field
          label="Interés por cuota"
          value={interest}
          onChange={setInterest}
          placeholder="0"
          suffix="%"
        />
      </div>
      {result ? (
        <ResultBox
          tone={result.cashWins ? 'ok' : 'info'}
          title={result.cashWins ? 'Conviene pagar de contado' : 'Las cuotas salen más baratas'}
        >
          <p>
            Contado: <strong>${formatARS(result.cashTotal)}</strong>
          </p>
          <p>
            En {cuotas} cuotas: <strong>${formatARS(result.installmentsTotal)}</strong> ($
            {formatARS(result.perInstallment)} c/u)
          </p>
          <p>
            Diferencia: ${formatARS(Math.abs(result.difference))}
            {result.cashWins ? ' a favor del contado.' : ' a favor de las cuotas.'}
          </p>
        </ResultBox>
      ) : null}
    </div>
  );
}

function RealRateCalc() {
  const [amount, setAmount] = useState('500000');
  const [nominal, setNominal] = useState('3.5');
  const [inflation, setInflation] = useState('4');
  const [months, setMonths] = useState('3');

  const result = useMemo(() => {
    const a = Number(amount);
    const n = Number(nominal);
    const i = Number(inflation);
    const m = Number(months);
    if (!amount || !months || [a, n, i, m].some(Number.isNaN)) return null;
    return calcRealRate(a, n, i, m);
  }, [amount, nominal, inflation, months]);

  return (
    <div>
      <p className="mb-4 font-serif text-sm leading-relaxed text-[var(--ink-muted)]">
        La tasa real mide si tu plata gana o pierde poder de compra. Usá la tasa mensual del plazo
        fijo y una inflación mensual estimada (no es consejo de inversión).
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Monto $" value={amount} onChange={setAmount} placeholder="500000" />
        <Field label="Meses" value={months} onChange={setMonths} placeholder="3" />
        <Field
          label="Tasa nominal mensual"
          value={nominal}
          onChange={setNominal}
          placeholder="3.5"
          suffix="%"
        />
        <Field
          label="Inflación mensual est."
          value={inflation}
          onChange={setInflation}
          placeholder="4"
          suffix="%"
        />
      </div>
      {result ? (
        <ResultBox
          tone={result.realExact >= 0 ? 'ok' : 'bad'}
          title={
            result.realExact >= 0
              ? `Tasa real positiva: ${formatPct(result.realExact)}`
              : `Tasa real negativa: ${formatPct(result.realExact)}`
          }
        >
          <p>
            Aprox. (nominal − inflación): {formatPct(result.realApprox)}. Exacta (compuesta):{' '}
            {formatPct(result.realExact)}.
          </p>
          <p>
            Al cabo de {months} meses tendrías ~${formatARS(result.finalNominal)} en pesos, pero con
            poder de compra equivalente a ~${formatARS(result.finalRealPower)} de hoy.
          </p>
        </ResultBox>
      ) : null}
    </div>
  );
}

export function EducationCalculators() {
  const [tool, setTool] = useState<ToolId | null>(null);
  const active = tool ? TOOLS.find((t) => t.id === tool) : null;

  return (
    <section aria-labelledby="calc-heading">
      <p className="ucu-section-title mb-2">Herramientas</p>
      <h1 id="calc-heading" className="ucu-title">
        Calculadoras
      </h1>
      <p className="mt-3 max-w-prose font-serif text-base leading-relaxed text-[var(--ink-muted)]">
        Elegí la que necesités. Son números orientativos: no reemplazan el resumen de tu banco ni un
        asesor.
      </p>

      {tool === null || !active ? (
        <div className="mt-8">
          <p className="mb-3 font-display text-sm font-bold text-[var(--ink)]">
            ¿Qué necesitás calcular?
          </p>
          <div className="grid gap-3 sm:grid-cols-2" role="list">
            {TOOLS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="listitem"
                onClick={() => setTool(t.id)}
                className="ucu-card-interactive group flex flex-col p-5 text-left"
              >
                <span className="font-display text-base font-bold tracking-tight text-[var(--ink)] group-hover:text-ucu-blue sm:text-lg">
                  {t.need}
                </span>
                <span className="mt-1.5 font-serif text-sm leading-snug text-[var(--ink-muted)]">
                  {t.blurb}
                </span>
                <span className="mt-4 font-display text-sm font-semibold text-ucu-magenta">
                  Abrir →
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-8">
          <button
            type="button"
            onClick={() => setTool(null)}
            className="ucu-btn-ghost mb-5"
          >
            ← Ver todas las calculadoras
          </button>

          <div className="ucu-card ucu-accent-top p-5 md:p-7">
            <p className="font-display text-xs font-bold uppercase tracking-[0.16em] text-ucu-blue">
              {active.label}
            </p>
            <h2 className="mt-1 font-display text-xl font-bold tracking-tight text-[var(--ink)] md:text-2xl">
              {active.need}
            </h2>

            <div
              className="mt-4 flex flex-wrap gap-2"
              role="tablist"
              aria-label="Cambiar de calculadora"
            >
              {TOOLS.map((t) => {
                const selected = t.id === tool;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setTool(t.id)}
                    className={cn(
                      'rounded-md px-3 py-1.5 font-display text-xs font-semibold transition',
                      selected
                        ? 'bg-ucu-blue text-white'
                        : 'border border-[var(--border)] text-[var(--ink)] hover:border-ucu-blue/40',
                    )}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>

            <div className="mt-6" role="tabpanel">
              {tool === 'ahorro' ? <SavingsCalc /> : null}
              {tool === 'tarjeta' ? <CardMinCalc /> : null}
              {tool === 'cuotas' ? <InstallmentsCalc /> : null}
              {tool === 'tasa-real' ? <RealRateCalc /> : null}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
