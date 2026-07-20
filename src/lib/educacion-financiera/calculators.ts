export function formatARS(value: number): string {
  return value.toLocaleString('es-AR', {
    maximumFractionDigits: 0,
  });
}

export function formatPct(value: number, digits = 1): string {
  return `${value.toLocaleString('es-AR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}%`;
}

export type SavingsResult = {
  capacity: number;
  savingsRate: number;
  emergencyFund: number;
  monthsToFund: number | null;
};

export function calcSavingsCapacity(income: number, expenses: number): SavingsResult | null {
  if (!Number.isFinite(income) || !Number.isFinite(expenses) || income < 0 || expenses < 0) {
    return null;
  }
  const capacity = income - expenses;
  const emergencyFund = expenses * 3;
  return {
    capacity,
    savingsRate: income > 0 ? (capacity / income) * 100 : 0,
    emergencyFund,
    monthsToFund: capacity > 0 ? Math.ceil(emergencyFund / capacity) : null,
  };
}

export type CardMinResult = {
  months: number;
  totalPaid: number;
  totalInterest: number;
  capped: boolean;
  paymentBelowInterest: boolean;
};

/** Simula pagar solo el mínimo hasta cancelar (tope 180 meses). */
export function calcCardMinimumPayoff(
  balance: number,
  monthlyRatePct: number,
  minPaymentPct: number,
): CardMinResult | null {
  if (
    !Number.isFinite(balance) ||
    !Number.isFinite(monthlyRatePct) ||
    !Number.isFinite(minPaymentPct) ||
    balance <= 0 ||
    monthlyRatePct < 0 ||
    minPaymentPct <= 0
  ) {
    return null;
  }

  const paymentBelowInterest = minPaymentPct <= monthlyRatePct;

  let saldo = balance;
  let totalPaid = 0;
  let totalInterest = 0;
  let months = 0;
  const rate = monthlyRatePct / 100;
  const minPct = minPaymentPct / 100;
  const maxMonths = 180;

  while (saldo > 1 && months < maxMonths) {
    const interest = saldo * rate;
    saldo += interest;
    totalInterest += interest;

    const payment = Math.max(saldo * minPct, 1);
    const applied = Math.min(payment, saldo);
    saldo -= applied;
    totalPaid += applied;
    months += 1;
  }

  return {
    months,
    totalPaid,
    totalInterest,
    capped: months >= maxMonths && saldo > 1,
    paymentBelowInterest,
  };
}

export type InstallmentsResult = {
  cashTotal: number;
  installmentsTotal: number;
  difference: number;
  cashWins: boolean;
  perInstallment: number;
};

export function calcCashVsInstallments(
  listPrice: number,
  cashDiscountPct: number,
  installments: number,
  interestPerInstallmentPct: number,
): InstallmentsResult | null {
  if (
    !Number.isFinite(listPrice) ||
    !Number.isFinite(cashDiscountPct) ||
    !Number.isFinite(installments) ||
    !Number.isFinite(interestPerInstallmentPct) ||
    listPrice <= 0 ||
    installments < 1
  ) {
    return null;
  }

  const cashTotal = listPrice * (1 - cashDiscountPct / 100);
  const installmentsTotal = listPrice * (1 + (interestPerInstallmentPct / 100) * installments);
  const difference = installmentsTotal - cashTotal;

  return {
    cashTotal,
    installmentsTotal,
    difference,
    cashWins: cashTotal <= installmentsTotal,
    perInstallment: installmentsTotal / installments,
  };
}

export type RealRateResult = {
  nominalMonthly: number;
  inflationMonthly: number;
  realApprox: number;
  realExact: number;
  finalNominal: number;
  finalRealPower: number;
};

export function calcRealRate(
  amount: number,
  nominalMonthlyPct: number,
  inflationMonthlyPct: number,
  months: number,
): RealRateResult | null {
  if (
    !Number.isFinite(amount) ||
    !Number.isFinite(nominalMonthlyPct) ||
    !Number.isFinite(inflationMonthlyPct) ||
    !Number.isFinite(months) ||
    amount <= 0 ||
    months < 1
  ) {
    return null;
  }

  const r = nominalMonthlyPct / 100;
  const i = inflationMonthlyPct / 100;
  const realExact = (1 + r) / (1 + i) - 1;
  const finalNominal = amount * Math.pow(1 + r, months);
  const finalRealPower = amount * Math.pow(1 + realExact, months);

  return {
    nominalMonthly: nominalMonthlyPct,
    inflationMonthly: inflationMonthlyPct,
    realApprox: nominalMonthlyPct - inflationMonthlyPct,
    realExact: realExact * 100,
    finalNominal,
    finalRealPower,
  };
}
