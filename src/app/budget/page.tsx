"use client";

import { PageHeader, Skeleton } from "@/components/ui";
import { BudgetForm } from "@/components/BudgetForm";
import { BillsList } from "@/components/BillsList";
import { useHydrated } from "@/core/store/hub";

export default function BudgetPage() {
  const hydrated = useHydrated();
  if (!hydrated) return <Skeleton />;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Money"
        title="Budget & bills"
        subtitle="Your monthly plan, and every bill in one checkable place."
      />
      <BudgetForm />
      <BillsList />
    </div>
  );
}
