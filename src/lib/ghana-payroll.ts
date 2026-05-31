/**
 * Ghana Payroll Engine — GRA 2024 rates
 *
 * Sources:
 * - GRA PAYE: https://gra.gov.gh/domestic-tax/tax-types/paye/
 * - SSNIT: https://www.ssnit.org.gh (18.5% total — 5.5% employee, 13% employer)
 * - PwC Tax Summaries: https://taxsummaries.pwc.com/ghana/individual/taxes-on-personal-income
 */

// ── PAYE Monthly graduated bands (GRA 2024) ──────────────────────
// Chargeable income = Gross Pay − SSNIT employee contribution
// Applied cumulatively (each bracket taxes only the slice within it)
export const PAYE_BANDS_MONTHLY = [
  { limit: 490,    rate: 0.00 },   // 0%  — up to GHS 490/mo
  { limit: 110,    rate: 0.05 },   // 5%  — next GHS 110
  { limit: 130,    rate: 0.10 },   // 10% — next GHS 130
  { limit: 3166.67,rate: 0.175 },  // 17.5% — next GHS 3,166.67
  { limit: 16000,  rate: 0.25 },   // 25% — next GHS 16,000
  { limit: 30520,  rate: 0.30 },   // 30% — next GHS 30,520
  { limit: Infinity,rate: 0.35 },  // 35% — above GHS 50,417
];

export const SSNIT_EMPLOYEE_RATE = 0.055;   // 5.5% of basic salary
export const SSNIT_EMPLOYER_RATE = 0.13;    // 13% of basic salary (school pays this)

/** Calculate monthly PAYE on chargeable income using graduated bands. */
export function calculatePAYE(chargeableIncome: number): number {
  let tax = 0;
  let remaining = chargeableIncome;
  for (const band of PAYE_BANDS_MONTHLY) {
    if (remaining <= 0) break;
    const taxable = Math.min(remaining, band.limit);
    tax += taxable * band.rate;
    remaining -= taxable;
  }
  return Math.round(tax * 100) / 100;
}

export interface CustomDeduction {
  id: string;          // uuid from the UI
  label: string;       // e.g. "Staff loan", "Cooperative", "Union dues"
  type: "fixed" | "percent";
  value: number;       // amount or percentage
}

export interface PayrollConfig {
  teacher_id: string;
  teacher_name: string;
  basic_salary: number;
  transport_allowance: number;
  housing_allowance: number;
  medical_allowance: number;
  responsibility_allowance: number;
  other_allowance: number;
  custom_deductions: CustomDeduction[];
  // computed flags
  ssnit_exempt?: boolean;  // e.g. if the teacher is not a citizen
}

export interface PayslipLine {
  label: string;
  amount: number;
  type: "earning" | "deduction" | "employer_cost" | "info";
}

export interface Payslip {
  teacher_id: string;
  teacher_name: string;
  period: string;       // e.g. "January 2025"
  basic_salary: number;
  total_allowances: number;
  gross_pay: number;
  ssnit_employee: number;
  chargeable_income: number;
  paye: number;
  custom_deductions_total: number;
  total_deductions: number;
  net_pay: number;
  ssnit_employer: number;  // school's cost (not deducted from employee)
  total_employer_cost: number;
  lines: PayslipLine[];
  custom_deductions: Array<{ label: string; amount: number }>;
}

export function computePayslip(config: PayrollConfig, period: string): Payslip {
  const {
    basic_salary, transport_allowance, housing_allowance,
    medical_allowance, responsibility_allowance, other_allowance,
  } = config;

  const total_allowances =
    transport_allowance + housing_allowance +
    medical_allowance + responsibility_allowance + other_allowance;

  const gross_pay = basic_salary + total_allowances;

  const ssnit_employee = config.ssnit_exempt
    ? 0
    : Math.round(basic_salary * SSNIT_EMPLOYEE_RATE * 100) / 100;

  const chargeable_income = Math.max(0, gross_pay - ssnit_employee);
  const paye = calculatePAYE(chargeable_income);

  const resolved_custom: Array<{ label: string; amount: number }> = (config.custom_deductions ?? []).map((d) => ({
    label: d.label,
    amount: d.type === "fixed"
      ? d.value
      : Math.round(gross_pay * (d.value / 100) * 100) / 100,
  }));
  const custom_deductions_total = resolved_custom.reduce((s, d) => s + d.amount, 0);

  const total_deductions = ssnit_employee + paye + custom_deductions_total;
  const net_pay = Math.round((gross_pay - total_deductions) * 100) / 100;

  const ssnit_employer = config.ssnit_exempt
    ? 0
    : Math.round(basic_salary * SSNIT_EMPLOYER_RATE * 100) / 100;
  const total_employer_cost = Math.round((gross_pay + ssnit_employer) * 100) / 100;

  const lines: PayslipLine[] = [
    { label: "Basic Salary", amount: basic_salary, type: "earning" },
    ...(transport_allowance > 0 ? [{ label: "Transport Allowance", amount: transport_allowance, type: "earning" as const }] : []),
    ...(housing_allowance > 0 ? [{ label: "Housing Allowance", amount: housing_allowance, type: "earning" as const }] : []),
    ...(medical_allowance > 0 ? [{ label: "Medical Allowance", amount: medical_allowance, type: "earning" as const }] : []),
    ...(responsibility_allowance > 0 ? [{ label: "Responsibility Allowance", amount: responsibility_allowance, type: "earning" as const }] : []),
    ...(other_allowance > 0 ? [{ label: "Other Allowance", amount: other_allowance, type: "earning" as const }] : []),
    { label: "Gross Pay", amount: gross_pay, type: "info" },
    { label: `SSNIT (5.5% of basic)`, amount: ssnit_employee, type: "deduction" },
    { label: `PAYE (income tax on GHS ${chargeable_income.toFixed(2)})`, amount: paye, type: "deduction" },
    ...resolved_custom.map((d) => ({ label: d.label, amount: d.amount, type: "deduction" as const })),
    { label: "Net Pay", amount: net_pay, type: "info" },
    { label: `SSNIT Employer (13% — school bears)`, amount: ssnit_employer, type: "employer_cost" },
    { label: "Total Employer Cost", amount: total_employer_cost, type: "employer_cost" },
  ];

  return {
    teacher_id: config.teacher_id,
    teacher_name: config.teacher_name,
    period,
    basic_salary,
    total_allowances,
    gross_pay,
    ssnit_employee,
    chargeable_income,
    paye,
    custom_deductions_total,
    total_deductions,
    net_pay,
    ssnit_employer,
    total_employer_cost,
    lines,
    custom_deductions: resolved_custom,
  };
}
