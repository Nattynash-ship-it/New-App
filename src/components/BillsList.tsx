"use client";

import { useState } from "react";
import { Card, SectionTitle } from "./ui";
import { useHub } from "@/core/store/hub";
import { monthKey, monthLabel } from "@/core/data/budget";
import { money, MoneyInput } from "./BudgetForm";

/**
 * The bills list — every recurring bill, checkable each month. Ticks recycle on
 * the 1st (they're stamped with the current month), so each month starts unpaid.
 */
export function BillsList() {
  const bills = useHub((s) => s.bills);
  const billChecks = useHub((s) => s.billChecks);
  const addBill = useHub((s) => s.addBill);
  const updateBill = useHub((s) => s.updateBill);
  const removeBill = useHub((s) => s.removeBill);
  const toggleBillPaid = useHub((s) => s.toggleBillPaid);

  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: "", amount: 0, dueDay: "" });

  const month = monthKey();
  const isPaid = (id: string) => billChecks[id] === month;

  const sorted = [...bills].sort((a, b) => (a.dueDay ?? 99) - (b.dueDay ?? 99));
  const total = bills.reduce((n, b) => n + (b.amount || 0), 0);
  const paidTotal = bills.filter((b) => isPaid(b.id)).reduce((n, b) => n + (b.amount || 0), 0);
  const paidCount = bills.filter((b) => isPaid(b.id)).length;
  const leftTotal = total - paidTotal;

  function submitAdd() {
    if (!draft.name.trim()) return;
    const day = draft.dueDay ? Math.min(31, Math.max(1, Number(draft.dueDay))) : undefined;
    addBill({ name: draft.name.trim(), amount: draft.amount, dueDay: day });
    setDraft({ name: "", amount: 0, dueDay: "" });
    setAdding(false);
  }

  return (
    <Card>
      <SectionTitle
        right={
          <span className="chip !text-[11px] border border-line text-muted">
            {paidCount}/{bills.length} paid
          </span>
        }
      >
        Bills
      </SectionTitle>
      <p className="-mt-1 mb-2 text-xs text-muted">
        Check each off as you pay it. They reset unpaid at the start of every month ({monthLabel()}).
      </p>

      {bills.length > 0 ? (
        <div className="mb-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <MiniStat label="Monthly total" value={money(total)} />
          <MiniStat label="Paid so far" value={money(paidTotal)} tone="meals" />
          <MiniStat label="Still to pay" value={money(leftTotal)} tone={leftTotal > 0 ? "fitness" : "meals"} />
        </div>
      ) : null}

      <ul className="space-y-1">
        {sorted.map((b) => {
          const paid = isPaid(b.id);
          return (
            <li key={b.id} className="group flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-paper">
              <button
                onClick={() => toggleBillPaid(b.id)}
                role="checkbox"
                aria-checked={paid}
                aria-label={paid ? `Mark ${b.name} unpaid` : `Mark ${b.name} paid`}
                className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md border transition-colors ${
                  paid ? "border-meals bg-meals text-white" : "border-ink/25 bg-surface hover:border-meals-bright"
                }`}
              >
                {paid ? (
                  <svg width="11" height="9" viewBox="0 0 10 8" fill="none" aria-hidden>
                    <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : null}
              </button>
              <input
                value={b.name}
                onChange={(e) => updateBill(b.id, { name: e.target.value })}
                aria-label="Bill name"
                className={`input min-w-0 flex-1 !py-1 text-xs ${paid ? "line-through opacity-60" : ""}`}
              />
              <label className="flex shrink-0 items-center gap-1 text-[10px] text-muted">
                Due
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={b.dueDay ?? ""}
                  placeholder="—"
                  onChange={(e) =>
                    updateBill(b.id, {
                      dueDay: e.target.value ? Math.min(31, Math.max(1, Number(e.target.value))) : undefined,
                    })
                  }
                  aria-label={`${b.name} due day`}
                  className="input !w-[46px] !py-1 !px-1 text-center text-xs"
                />
              </label>
              <MoneyInput value={b.amount} onChange={(n) => updateBill(b.id, { amount: n })} label={`${b.name} amount`} />
              <button
                onClick={() => removeBill(b.id)}
                aria-label={`Remove ${b.name}`}
                className="shrink-0 rounded-full px-1 text-muted opacity-0 transition-opacity hover:text-fitness-bright group-hover:opacity-100"
              >
                ×
              </button>
            </li>
          );
        })}
        {bills.length === 0 ? (
          <li className="px-1 py-3 text-center text-xs text-muted">No bills yet — add one below.</li>
        ) : null}
      </ul>

      {adding ? (
        <div className="mt-2 space-y-2 rounded-xl border border-line bg-paper p-2.5">
          <div className="flex items-center gap-2">
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="Bill name (e.g. Car insurance)"
              className="input flex-1 !py-1.5 text-xs"
              autoFocus
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1 text-[11px] text-muted">
              Due day
              <input
                type="number"
                min={1}
                max={31}
                value={draft.dueDay}
                onChange={(e) => setDraft({ ...draft, dueDay: e.target.value })}
                placeholder="1–31"
                className="input !w-[64px] !py-1 text-center text-xs"
              />
            </label>
            <MoneyInput value={draft.amount} onChange={(n) => setDraft({ ...draft, amount: n })} label="New bill amount" />
            <button onClick={submitAdd} disabled={!draft.name.trim()} className="btn-primary shrink-0 !px-3 !py-1.5 text-xs">
              Add
            </button>
            <button onClick={() => setAdding(false)} className="text-[11px] text-muted hover:text-ink">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="btn-ghost mt-2 !px-3 !py-1.5 text-xs">
          ＋ Add a bill
        </button>
      )}
    </Card>
  );
}

const MINI_TONE: Record<string, string> = {
  meals: "text-meals-bright",
  fitness: "text-fitness-bright",
  muted: "text-muted",
};

function MiniStat({ label, value, tone = "muted" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-line bg-paper px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</p>
      <p className={`mt-0.5 text-sm font-bold tabular-nums ${MINI_TONE[tone] ?? "text-ink"}`}>{value}</p>
    </div>
  );
}
