/**
 * Budget + bills data model — a simple monthly budget (income vs. planned/actual
 * expenses, like a spreadsheet) plus a checkable list of recurring bills whose
 * "paid" ticks recycle each month.
 */

export interface BudgetLine {
  id: string;
  label: string;
  /** Planned monthly amount. */
  amount: number;
  /** What you actually spent (expenses only; optional). */
  actual?: number;
  /** Expense grouping (expenses only). */
  category?: string;
}

export interface Bill {
  id: string;
  name: string;
  /** Amount due each month. */
  amount: number;
  /** Day of the month it's due (1–31), optional. */
  dueDay?: number;
}

/** Standard expense categories, mirroring a typical budget spreadsheet. */
export const EXPENSE_CATEGORIES = [
  "Housing",
  "Utilities",
  "Food",
  "Transportation",
  "Insurance",
  "Debt",
  "Savings",
  "Childcare",
  "Health",
  "Personal",
  "Entertainment",
  "Other",
] as const;

/** Current month key "YYYY-MM" — bill checks recycle when this changes. */
export function monthKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** A friendly label for the current month, e.g. "August 2026". */
export function monthLabel(d: Date = new Date()): string {
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

let n = 0;
const bid = (p: string) => `${p}_seed${n++}`;

/** A blank-but-structured expense template — the "excel form" to fill in. */
export function seedBudgetExpenses(): BudgetLine[] {
  const rows: Array<[string, string]> = [
    ["Housing", "Rent / mortgage"],
    ["Utilities", "Electric"],
    ["Utilities", "Water"],
    ["Utilities", "Internet"],
    ["Food", "Groceries"],
    ["Transportation", "Transit / gas"],
    ["Childcare", "Childcare"],
    ["Debt", "Student loans"],
    ["Savings", "Savings"],
    ["Personal", "Phone"],
  ];
  return rows.map(([category, label]) => ({ id: bid("ex"), label, amount: 0, actual: 0, category }));
}

export function seedBudgetIncomes(): BudgetLine[] {
  return [{ id: bid("in"), label: "Paycheck", amount: 0 }];
}

/** A small starter list of common bills — all editable, at $0 to fill in. */
export function seedBills(): Bill[] {
  return [
    { id: bid("bill"), name: "Rent", amount: 0, dueDay: 1 },
    { id: bid("bill"), name: "Electric", amount: 0, dueDay: 15 },
    { id: bid("bill"), name: "Internet", amount: 0, dueDay: 20 },
    { id: bid("bill"), name: "Phone", amount: 0, dueDay: 25 },
  ];
}
