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

/** Natasha's real recurring bills. Amounts start blank because they vary each
 *  month — fill them in as they come. Add anything else right in the app. */
export const BILL_NAMES = [
  "Netflix",
  "Spotify",
  "Groceries",
  "School",
  "Savings",
  "Rent",
  "Chase S",
  "Chase F",
  "Phone bill",
  "American Express",
  "Optimum",
  "Cap 1",
  "Con Edison",
] as const;

export function seedBills(): Bill[] {
  return BILL_NAMES.map((name) => ({ id: bid("bill"), name, amount: 0 }));
}

/** The old placeholder bill set, used only to detect an untouched first-run
 *  bills list so we can safely swap in the real ones without clobbering edits. */
export const LEGACY_PLACEHOLDER_BILLS = ["Rent", "Electric", "Internet", "Phone"];

/** True when the saved bills are still exactly the untouched placeholders
 *  (all at $0, none ticked) — safe to replace with the real list. */
export function isUntouchedPlaceholderBills(
  bills: Bill[] | undefined,
  billChecks: Record<string, string> | undefined,
): boolean {
  if (!Array.isArray(bills) || bills.length !== LEGACY_PLACEHOLDER_BILLS.length) return false;
  if (billChecks && Object.keys(billChecks).length > 0) return false;
  return bills.every(
    (b) => LEGACY_PLACEHOLDER_BILLS.includes(b.name) && !(b.amount > 0),
  );
}
