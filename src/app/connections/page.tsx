"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, PageHeader, SectionTitle, Skeleton } from "@/components/ui";
import { useHub, useHydrated } from "@/core/store/hub";
import type { DeliveryService } from "@/core/types";

const GROCERY: Array<{ id: DeliveryService; label: string; icon: string; hint: string }> = [
  { id: "whole_foods", label: "Whole Foods", icon: "🥬", hint: "Amazon / Whole Foods delivery" },
  { id: "aldi", label: "Aldi", icon: "🛒", hint: "Aldi delivery (Instacart-powered)" },
  { id: "instacart", label: "Instacart", icon: "🧺", hint: "Instacart marketplace" },
];

function GroceryRow({ service }: { service: (typeof GROCERY)[number] }) {
  const saved = useHub((s) => s.groceryConnections[service.id]);
  const setGroceryConnection = useHub((s) => s.setGroceryConnection);
  const [url, setUrl] = useState(saved ?? "");
  const [status, setStatus] = useState("");
  const connected = Boolean(saved);

  async function test() {
    const target = url.trim();
    if (!/^https?:\/\//i.test(target)) {
      setStatus("Enter a valid https:// webhook URL first.");
      return;
    }
    setStatus("Testing…");
    try {
      const res = await fetch("/api/webhooks/grocery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service: service.id,
          url: target,
          items: [{ name: "Test item", quantity: "1", category: "pantry" }],
        }),
      });
      const data = (await res.json()) as { status?: string; message?: string };
      setStatus(
        data.status === "forwarded"
          ? "Success — your webhook received a test order ✓"
          : data.message ?? "Sent, but the service didn't confirm.",
      );
    } catch {
      setStatus("Couldn't reach the webhook.");
    }
  }

  return (
    <div className="rounded-xl border border-line p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-medium">
          <span aria-hidden>{service.icon}</span>
          {service.label}
          <span className="text-xs font-normal text-muted">· {service.hint}</span>
        </span>
        <span
          className={`chip ${connected ? "bg-meals-soft text-meals-bright" : "border border-line text-muted"}`}
        >
          {connected ? "● Connected" : "Not connected"}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https:// your delivery webhook (Zapier, Make, or partner API)"
          className="input min-w-[200px] flex-1 !py-1.5 text-xs"
        />
        <button
          className="btn-primary !px-3 !py-1.5 text-xs"
          onClick={() => {
            setGroceryConnection(service.id, url);
            setStatus(url.trim() ? "Saved ✓" : "Cleared.");
          }}
        >
          Save
        </button>
        <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => void test()} disabled={!url.trim()}>
          Test
        </button>
      </div>
      {status ? <p className="mt-1.5 text-xs text-muted">{status}</p> : null}
    </div>
  );
}

const EMAIL: Array<{ id: string; label: string; icon: string; desc: string }> = [
  { id: "google", label: "Gmail", icon: "✉️", desc: "Pull events, deadlines & school notices from your inbox automatically." },
  { id: "microsoft", label: "Outlook", icon: "📧", desc: "Sync meetings and messages from your Microsoft account." },
  { id: "school", label: "School email & account", icon: "🎓", desc: "Catch announcements and due dates so nothing slips." },
];

function EmailRow({ provider }: { provider: (typeof EMAIL)[number] }) {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function connect() {
    setBusy(true);
    setStatus("");
    try {
      const res = await fetch(`/api/connect/${provider.id}`);
      const data = (await res.json()) as { configured?: boolean; authUrl?: string; message?: string };
      if (data.configured && data.authUrl) {
        window.location.href = data.authUrl;
        return;
      }
      setStatus(data.message ?? "Not available yet.");
    } catch {
      setStatus("Couldn't start sign-in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-line p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-medium">
            <span aria-hidden>{provider.icon}</span>
            {provider.label}
          </p>
          <p className="mt-0.5 text-xs text-muted">{provider.desc}</p>
        </div>
        <button className="btn-ghost shrink-0 !px-3 !py-1.5 text-xs" onClick={() => void connect()} disabled={busy}>
          {busy ? "…" : "Connect"}
        </button>
      </div>
      {status ? <p className="mt-2 rounded-lg bg-paper px-2.5 py-1.5 text-[11px] text-muted">{status}</p> : null}
    </div>
  );
}

function SchoolPortalRow() {
  const saved = useHub((s) => s.schoolPortalUrl);
  const setSchoolPortalUrl = useHub((s) => s.setSchoolPortalUrl);
  const [url, setUrl] = useState(saved || "https://my.wgu.edu");
  const [status, setStatus] = useState("");
  const connected = Boolean(saved);

  function normalize(raw: string): string {
    const t = raw.trim();
    if (!t) return "";
    return /^https?:\/\//i.test(t) ? t : `https://${t}`;
  }

  return (
    <div className="rounded-xl border border-line p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-medium">
          <span aria-hidden>🎓</span>
          School portal
          <span className="text-xs font-normal text-muted">· one tap to your school website</span>
        </span>
        <span className={`chip ${connected ? "bg-school-soft text-school-bright" : "border border-line text-muted"}`}>
          {connected ? "● Saved" : "Not saved"}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://my.wgu.edu"
          className="input min-w-[200px] flex-1 !py-1.5 text-xs"
        />
        <button
          className="btn-primary !px-3 !py-1.5 text-xs"
          onClick={() => {
            const n = normalize(url);
            setSchoolPortalUrl(n);
            setUrl(n);
            setStatus(n ? "Saved ✓" : "Cleared.");
          }}
        >
          Save
        </button>
        <button
          className="btn-ghost !px-3 !py-1.5 text-xs"
          onClick={() => window.open(normalize(url), "_blank", "noopener")}
          disabled={!url.trim()}
        >
          Open ↗
        </button>
      </div>
      <p className="mt-1.5 text-[11px] text-muted">
        Saved on your device. Your portal opens in a new tab — Vela never sees your school password.
      </p>
      {status ? <p className="mt-1 text-xs text-muted">{status}</p> : null}
    </div>
  );
}

function AlertsRow() {
  const enabled = useHub((s) => s.alertsEnabled);
  const setAlertsEnabled = useHub((s) => s.setAlertsEnabled);
  const [status, setStatus] = useState("");

  async function enable() {
    if (typeof Notification === "undefined") {
      setStatus("This browser doesn't support notifications.");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      setAlertsEnabled(true);
      new Notification("Vela alerts are on ✓", {
        body: "You'll get a heads-up here when new school email arrives (once your inbox is connected).",
      });
      setStatus("Alerts enabled — that test notification confirms they work.");
    } else {
      setAlertsEnabled(false);
      setStatus("Notifications are blocked. Allow them in your browser settings to get alerts.");
    }
  }

  return (
    <div className="rounded-xl border border-line p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-medium">
            <span aria-hidden>🔔</span>
            New-email alerts
          </p>
          <p className="mt-0.5 text-xs text-muted">
            Get a notification when new school email lands. Turn on alerts here, then connect your
            inbox above — on a deployed Vela, new messages ping you automatically.
          </p>
        </div>
        {enabled ? (
          <span className="chip shrink-0 bg-school-soft text-school-bright">● On</span>
        ) : (
          <button className="btn-ghost shrink-0 !px-3 !py-1.5 text-xs" onClick={() => void enable()}>
            Enable
          </button>
        )}
      </div>
      {status ? <p className="mt-2 rounded-lg bg-paper px-2.5 py-1.5 text-[11px] text-muted">{status}</p> : null}
    </div>
  );
}

export default function ConnectionsPage() {
  const hydrated = useHydrated();
  if (!hydrated) return <Skeleton />;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Connections"
        title="Connect your services"
        subtitle="Send grocery lists to your delivery service, and link your inbox so nothing slips."
      />

      <Card>
        <SectionTitle right={<span className="text-xs text-muted">real, once you paste a webhook</span>}>
          Grocery & delivery
        </SectionTitle>
        <p className="-mt-1 mb-3 text-xs text-muted">
          Whole Foods, Aldi, and Instacart don&apos;t offer public cart APIs, so Vela forwards your
          grocery list to a webhook you control — point it at a Zapier / Make automation (or a
          partner API) and orders flow straight through. Your list is sent server-side, so there are
          no browser CORS headaches.
        </p>
        <div className="space-y-2">
          {GROCERY.map((s) => (
            <GroceryRow key={s.id} service={s} />
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle right={<span className="text-xs text-muted">activates on deploy</span>}>
          Email & school
        </SectionTitle>
        <p className="-mt-1 mb-3 text-xs text-muted">
          Connecting an inbox uses secure sign-in (OAuth) and a small server component to hold the
          keys — so it switches on once Vela is deployed with credentials configured. The buttons
          below are wired to that flow now; on this local build they&apos;ll tell you it isn&apos;t
          set up yet.
        </p>
        <div className="space-y-2">
          <SchoolPortalRow />
          {EMAIL.map((p) => (
            <EmailRow key={p.id} provider={p} />
          ))}
          <AlertsRow />
        </div>
      </Card>

      <p className="text-center text-xs text-muted">
        <Link href="/settings" className="hover:text-ink">
          ← Back to Settings
        </Link>
      </p>
    </div>
  );
}
