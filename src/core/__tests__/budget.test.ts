import { beforeAll, describe, expect, it } from "vitest";
import {
  BILL_NAMES,
  isUntouchedPlaceholderBills,
  monthKey,
  monthLabel,
  seedBills,
} from "../data/budget";

beforeAll(() => {
  const mem = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
      clear: () => mem.clear(),
    },
  });
});

describe("budget month helpers", () => {
  it("formats a stable YYYY-MM key", () => {
    expect(monthKey(new Date(2026, 7, 31))).toBe("2026-08");
    expect(monthKey(new Date(2026, 0, 1))).toBe("2026-01");
  });
  it("gives a friendly month label", () => {
    expect(monthLabel(new Date(2026, 7, 15))).toMatch(/August 2026/);
  });
});

describe("real bills seed + safe placeholder swap", () => {
  it("seeds the real bill names at $0", () => {
    const bills = seedBills();
    expect(bills.map((b) => b.name)).toEqual([...BILL_NAMES]);
    expect(bills.every((b) => b.amount === 0)).toBe(true);
  });

  it("detects an untouched placeholder set (safe to replace)", () => {
    const placeholders = [
      { id: "1", name: "Rent", amount: 0 },
      { id: "2", name: "Electric", amount: 0 },
      { id: "3", name: "Internet", amount: 0 },
      { id: "4", name: "Phone", amount: 0 },
    ];
    expect(isUntouchedPlaceholderBills(placeholders, {})).toBe(true);
  });

  it("won't replace once a bill has an amount or a paid tick", () => {
    const edited = [
      { id: "1", name: "Rent", amount: 1400 },
      { id: "2", name: "Electric", amount: 0 },
      { id: "3", name: "Internet", amount: 0 },
      { id: "4", name: "Phone", amount: 0 },
    ];
    expect(isUntouchedPlaceholderBills(edited, {})).toBe(false);
    const ticked = [
      { id: "1", name: "Rent", amount: 0 },
      { id: "2", name: "Electric", amount: 0 },
      { id: "3", name: "Internet", amount: 0 },
      { id: "4", name: "Phone", amount: 0 },
    ];
    expect(isUntouchedPlaceholderBills(ticked, { "1": monthKey() })).toBe(false);
  });

  it("won't replace the real list (different names/length)", () => {
    expect(isUntouchedPlaceholderBills(seedBills(), {})).toBe(false);
  });
});

describe("budget + bills store", () => {
  it("adds, updates, and removes income and expense lines", async () => {
    const { useHub } = await import("../store/hub");
    const s = () => useHub.getState();

    const beforeIn = s().budgetIncomes.length;
    s().addIncome("Side gig", 500);
    const line = s().budgetIncomes.find((l) => l.label === "Side gig")!;
    expect(line.amount).toBe(500);
    s().updateIncome(line.id, { amount: 650 });
    expect(s().budgetIncomes.find((l) => l.id === line.id)!.amount).toBe(650);
    s().removeIncome(line.id);
    expect(s().budgetIncomes.length).toBe(beforeIn);

    s().addExpense("Coffee", 40, "Personal");
    const ex = s().budgetExpenses.find((l) => l.label === "Coffee")!;
    expect(ex.category).toBe("Personal");
    s().updateExpense(ex.id, { actual: 55 });
    expect(s().budgetExpenses.find((l) => l.id === ex.id)!.actual).toBe(55);
    s().removeExpense(ex.id);
    expect(s().budgetExpenses.find((l) => l.label === "Coffee")).toBeUndefined();
  });

  it("checks a bill paid for this month and recycles it", async () => {
    const { useHub } = await import("../store/hub");
    const s = () => useHub.getState();

    s().addBill({ name: "Gym", amount: 30, dueDay: 5 });
    const bill = s().bills.find((b) => b.name === "Gym")!;

    // Not paid until ticked.
    expect(s().billChecks[bill.id]).toBeUndefined();
    s().toggleBillPaid(bill.id);
    expect(s().billChecks[bill.id]).toBe(monthKey());
    // Untick.
    s().toggleBillPaid(bill.id);
    expect(s().billChecks[bill.id]).toBeUndefined();

    // A tick stamped for a past month does not count as paid now.
    s().toggleBillPaid(bill.id);
    // Simulate a stale prior-month stamp by rewriting the record directly.
    const stale = { ...s().billChecks, [bill.id]: "2000-01" };
    useHub.setState({ billChecks: stale });
    // Toggling now clears stale entries and marks the current month.
    s().toggleBillPaid(bill.id);
    expect(s().billChecks[bill.id]).toBe(monthKey());

    s().removeBill(bill.id);
    expect(s().bills.find((b) => b.name === "Gym")).toBeUndefined();
    expect(s().billChecks[bill.id]).toBeUndefined();
  });

  it("keeps budget slices through export → import", async () => {
    const { useHub } = await import("../store/hub");
    const s = () => useHub.getState();
    s().addBill({ name: "Water", amount: 45 });
    const snapshot = s().exportData();
    useHub.setState({ bills: [] });
    expect(s().importData(snapshot)).toBe(true);
    expect(s().bills.find((b) => b.name === "Water")).toBeTruthy();
  });
});
