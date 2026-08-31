"use client";

import { useState } from "react";
import { Card, SectionTitle } from "./ui";
import { useHub } from "@/core/store/hub";
import { EXPENSE_CATEGORIES, monthLabel } from "@/core/data/budget";

const fmt = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const fmtc = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" });
export function money(n: number, cents = false): string {
  return (cents ? fmtc : fmt).format(Number.isFinite(n) ? n : 0);
}

/** A borderless number input that reads $ amounts; blank shows a 0 placeholder. */
export function MoneyInput({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (n: number) => void;
  label: string;
}) {
  return (
    <span className="relative">
      <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-muted">$</span>
      <input
        type="number"
        inputMode="decimal"
        min={0}
        step="0.01"
        aria-label={label}
        value={value ? String(value) : ""}
        placeholder="0"
        onChange={(e) => onChange(e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)))}
        className="input !w-[92px] !py-1 !pl-5 !pr-1.5 text-right text-xs tabular-nums"
      />
    </span>
  );
}

/**
 * The monthly budget "form" — income lines and planned/actual expense lines,
 * like a spreadsheet, with a live summary. Everything is editable inline.
 */
export function BudgetForm() {
  const incomes = useHub((s) => s.budgetIncomes);
  const expenses = useHub((s) => s.budgetExpenses);
  const addIncome = useHub((s) => s.addIncome);
  const updateIncome = useHub((s) => s.updateIncome);
  const removeIncome = useHub((s) => s.removeIncome);
  const addExpense = useHub((s) => s.addExpense);
  const updateExpense = useHub((s) => s.updateExpense);
  const removeExpense = useHub((s) => s.removeExpense);

  const [exCat, setExCat] = useState<string>(EXPENSE_CATEGORIES[0]);

  const totalIncome = incomes.reduce((n, l) => n + (l.amount || 0), 0);
  const totalPlanned = expenses.reduce((n, l) => n + (l.amount || 0), 0);
  const totalSpent = expenses.reduce((n, l) => n + (l.actual || 0), 0);
  const leftToBudget = totalIncome - totalPlanned;
  const remaining = totalIncome - totalSpent;

  // Group expenses by category for a tidy, spreadsheet-like layout.
  const groups = EXPENSE_CATEGORIES.map((cat) => ({
    cat,
    rows: expenses.filter((e) => (e.category ?? "Other") === cat),
  })).filter((g) => g.rows.length > 0);
  const ungrouped = expenses.filter(
    (e) => !(EXPENSE_CATEGORIES as readonly string[]).includes(e.category ?? "Other"),
  );

  return (
    <div className="space-y-5">
      {/* Summary */}
      <Card className="relative overflow-hidden">
        <span className="absolute inset-x-0 top-0 h-[3px] bg-accent" aria-hidden />
        <SectionTitle right={<span className="text-xs text-muted">{monthLabel()}</span>}>
          Monthly overview
        </SectionTitle>
        <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Income" value={money(totalIncome)} tone="meals" />
          <Stat label="Planned" value={money(totalPlanned)} tone="work" />
          <Stat label="Spent" value={money(totalSpent)} tone="family" />
          <Stat
            label={remaining >= 0 ? "Left this month" : "Over budget"}
            value={money(Math.abs(remaining))}
            tone={remaining >= 0 ? "accent" : "fitness"}
          />
        </div>
        <p className="mt-2 text-xs text-muted">
          {leftToBudget >= 0 ? (
            <>You have <span className="font-semibold text-accent">{money(leftToBudget)}</span> left to assign after your planned expenses.</>
          ) : (
            <>Your plan is <span className="font-semibold text-fitness-bright">{money(-leftToBudget)}</span> over your income — trim a line or two.</>
          )}
        </p>
      </Card>

      {/* Income */}
      <Card>
        <SectionTitle right={<span className="chip bg-meals-soft text-meals-bright !text-[11px]">{money(totalIncome)}</span>}>
          Income
        </SectionTitle>
        <ul className="mt-1 space-y-1">
          {incomes.map((l) => (
            <li key={l.id} className="group flex items-center gap-2">
              <input
                value={l.label}
                onChange={(e) => updateIncome(l.id, { label: e.target.value })}
                aria-label="Income source"
                className="input min-w-0 flex-1 !py-1 text-xs"
              />
              <MoneyInput value={l.amount} onChange={(n) => updateIncome(l.id, { amount: n })} label={`${l.label} amount`} />
              <button
                onClick={() => removeIncome(l.id)}
                aria-label={`Remove ${l.label}`}
                className="shrink-0 rounded-full px-1 text-muted opacity-0 transition-opacity hover:text-fitness-bright group-hover:opacity-100"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
        <button onClick={() => addIncome("", 0)} className="btn-ghost mt-2 !px-3 !py-1.5 text-xs">
          ＋ Add income
        </button>
      </Card>

      {/* Expenses */}
      <Card>
        <SectionTitle right={<span className="chip bg-work-soft text-work-bright !text-[11px]">{money(totalPlanned)} planned</span>}>
          Expenses
        </SectionTitle>
        <div className="mt-1 flex items-center gap-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
          <span className="flex-1">Item</span>
          <span className="w-[92px] text-right">Planned</span>
          <span className="w-[92px] text-right">Spent</span>
          <span className="w-4" />
        </div>
        {[...groups, ...(ungrouped.length ? [{ cat: "Other", rows: ungrouped }] : [])].map((g) => (
          <div key={g.cat} className="mt-2">
            <p className="mb-0.5 px-1 text-[11px] font-semibold text-ink/70">{g.cat}</p>
            <ul className="space-y-1">
              {g.rows.map((l) => (
                <li key={l.id} className="group flex items-center gap-2">
                  <input
                    value={l.label}
                    onChange={(e) => updateExpense(l.id, { label: e.target.value })}
                    aria-label="Expense item"
                    className="input min-w-0 flex-1 !py-1 text-xs"
                  />
                  <MoneyInput value={l.amount} onChange={(n) => updateExpense(l.id, { amount: n })} label={`${l.label} planned`} />
                  <MoneyInput value={l.actual ?? 0} onChange={(n) => updateExpense(l.id, { actual: n })} label={`${l.label} spent`} />
                  <button
                    onClick={() => removeExpense(l.id)}
                    aria-label={`Remove ${l.label}`}
                    className="shrink-0 rounded-full px-1 text-muted opacity-0 transition-opacity hover:text-fitness-bright group-hover:opacity-100"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div className="mt-3 flex items-center gap-2">
          <select
            value={exCat}
            onChange={(e) => setExCat(e.target.value)}
            aria-label="New expense category"
            className="input !w-auto !py-1.5 text-xs"
          >
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <button onClick={() => addExpense("New item", 0, exCat)} className="btn-ghost !px-3 !py-1.5 text-xs">
            ＋ Add expense
          </button>
        </div>
        <div className="mt-3 flex justify-between border-t border-line pt-2 text-xs">
          <span className="font-semibold">Totals</span>
          <span className="flex gap-3 tabular-nums">
            <span className="text-work-bright">{money(totalPlanned)} planned</span>
            <span className="text-family-bright">{money(totalSpent)} spent</span>
          </span>
        </div>
      </Card>
    </div>
  );
}

// Full class strings so Tailwind keeps them (no dynamic `bg-${tone}` names).
const TONE = {
  meals: { box: "bg-meals-soft", label: "text-meals-bright" },
  work: { box: "bg-work-soft", label: "text-work-bright" },
  family: { box: "bg-family-soft", label: "text-family-bright" },
  accent: { box: "bg-accent-soft", label: "text-accent" },
  fitness: { box: "bg-fitness-soft", label: "text-fitness-bright" },
} as const;

function Stat({ label, value, tone }: { label: string; value: string; tone: keyof typeof TONE }) {
  const t = TONE[tone];
  return (
    <div className={`rounded-xl ${t.box} px-3 py-2`}>
      <p className={`text-[10px] font-semibold uppercase tracking-wider ${t.label}`}>{label}</p>
      <p className="mt-0.5 text-base font-bold tabular-nums text-ink">{value}</p>
    </div>
  );
}
