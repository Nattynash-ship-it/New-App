"use client";

import Link from "next/link";
import { DOMAIN_STYLES } from "./ui";
import { selectDomainSummaries } from "@/core/selectors";
import { useHub } from "@/core/store/hub";

const DOMAIN_TITLE: Record<string, string> = {
  work: "Work",
  school: "School",
  meals: "Meals",
  fitness: "Fitness",
  family: "Family",
};

/**
 * Everything at a glance: one live tile per life area, each a shortcut into
 * its module. This is the "whole life in one view" layer of the Compass.
 */
export function OverviewStrip() {
  const state = useHub();
  const summaries = selectDomainSummaries(state);

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
      {summaries.map((s) => {
        const style = DOMAIN_STYLES[s.domain];
        return (
          <Link
            key={s.domain}
            href={s.href}
            className="group card relative overflow-hidden p-3.5 transition-all hover:shadow-lift hover:-translate-y-0.5"
          >
            <span className={`absolute inset-x-0 top-0 h-[3px] ${style.dot}`} aria-hidden />
            <p className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${style.text}`}>
              {DOMAIN_TITLE[s.domain]}
            </p>
            <p className="mt-1.5 line-clamp-2 text-[13px] font-medium leading-snug">{s.headline}</p>
            <p className="mt-0.5 truncate text-[11px] text-muted">{s.detail}</p>
          </Link>
        );
      })}
    </div>
  );
}
