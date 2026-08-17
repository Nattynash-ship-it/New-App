"use client";

import { useEffect, useState } from "react";
import { Card, SectionTitle } from "./ui";
import {
  isIOS,
  isInstalled,
  notifyBlocker,
  notifyPermission,
  requestNotifyPermission,
  showNotification,
  type NotifyPermission,
} from "@/lib/notify";

const STATE_LABEL: Record<NotifyPermission, { label: string; chip: string }> = {
  granted: { label: "● On", chip: "bg-meals-soft text-meals-bright" },
  denied: { label: "Blocked", chip: "bg-fitness-soft text-fitness-bright" },
  default: { label: "Not enabled", chip: "border border-line text-muted" },
  unsupported: { label: "Unavailable", chip: "border border-line text-muted" },
};

/**
 * One place to see whether reminders can actually reach you, and to prove it
 * with a test. Notifications silently doing nothing is the worst failure mode —
 * especially on iPhone/iPad, where they only work from the Home Screen icon.
 */
export function NotificationSettings() {
  const [perm, setPerm] = useState<NotifyPermission>("default");
  const [blocker, setBlocker] = useState<string | null>(null);
  const [ios, setIos] = useState(false);
  const [installed, setInstalled] = useState(true);
  const [status, setStatus] = useState("");

  function refresh() {
    setPerm(notifyPermission());
    setBlocker(notifyBlocker());
    setIos(isIOS());
    setInstalled(isInstalled());
  }

  useEffect(refresh, []);

  async function enable() {
    const p = await requestNotifyPermission();
    refresh();
    setPerm(p);
    if (p === "granted") {
      const shown = await showNotification("Reminders are on ✓", {
        body: "This is what an event reminder will look like.",
        tag: "vela-test",
      });
      setStatus(
        shown
          ? "Enabled — that test notification confirms they reach you."
          : "Permission granted, but the notification couldn't be shown. Make sure Vela is open from its Home Screen icon.",
      );
    } else if (p === "denied") {
      setStatus("You declined. Allow notifications for Vela in your browser/system settings.");
    } else {
      setStatus("");
    }
  }

  async function test() {
    const shown = await showNotification("Test from Vela ✦", {
      body: "If you can see this, reminders are working.",
      tag: "vela-test",
    });
    setStatus(
      shown
        ? "Sent — check your notifications. On iPad, pull down from the top to see it."
        : "Couldn't show it. Reminders need Vela opened from its Home Screen icon.",
    );
  }

  const meta = STATE_LABEL[perm];

  return (
    <Card>
      <SectionTitle right={<span className={`chip ${meta.chip}`}>{meta.label}</span>}>
        Reminders &amp; notifications
      </SectionTitle>
      <p className="-mt-1 mb-3 text-xs text-muted">
        Vela can nudge you when an event starts or a task is due. Reminders are local to this
        device — they fire while Vela is open or in the background, with no account needed.
      </p>

      {blocker ? (
        <p className="mb-3 rounded-xl bg-fitness-soft px-3 py-2 text-xs text-fitness-bright">{blocker}</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {perm !== "granted" ? (
          <button className="btn-primary text-sm" onClick={() => void enable()} disabled={perm === "unsupported"}>
            Turn on reminders
          </button>
        ) : null}
        <button
          className="btn-ghost text-sm"
          onClick={() => void test()}
          disabled={perm !== "granted"}
        >
          Send a test notification
        </button>
        <button className="btn-ghost text-sm" onClick={refresh}>
          Re-check
        </button>
      </div>

      {status ? <p className="mt-2 text-xs text-accent">{status}</p> : null}

      {ios ? (
        <div className="mt-3 rounded-xl border border-line bg-paper p-3 text-xs text-muted">
          <p className="mb-1 font-semibold text-ink">On iPhone &amp; iPad</p>
          <ol className="list-decimal space-y-0.5 pl-4">
            <li>
              Open Vela in Safari and tap <span className="font-medium text-ink">Share → Add to Home Screen</span>.
              {installed ? " ✓ done" : ""}
            </li>
            <li>Open Vela from that new icon (not the Safari tab).</li>
            <li>Tap “Turn on reminders” above and allow when iOS asks.</li>
          </ol>
          <p className="mt-1.5">
            Apple only allows web-app notifications from an installed Home Screen app (iOS 16.4+) —
            they can&apos;t work in a normal Safari tab.
          </p>
        </div>
      ) : null}

      <p className="mt-3 text-[11px] text-muted">
        Honest limit: Vela has no server, so reminders fire from your device while the app is open
        or recently backgrounded. For anything you truly can&apos;t miss, keep a copy in your device
        calendar too.
      </p>
    </Card>
  );
}
