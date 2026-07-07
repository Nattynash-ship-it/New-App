"use client";

import { useHub } from "@/core/store/hub";

const OUTLOOK_URL = "https://outlook.office.com/mail/";

/** One-tap jumps that live on the home page: school portal + school email. */
export function HomeQuickLinks() {
  const portal = useHub((s) => s.schoolPortalUrl);

  return (
    <div className="flex flex-wrap gap-2">
      <a
        href={portal || "/connections"}
        target={portal ? "_blank" : undefined}
        rel="noreferrer"
        className="btn-ghost !px-3 !py-1.5 text-xs"
        title={portal ? `Open ${portal}` : "Add your school portal in Connections"}
      >
        🎓 {portal ? "School portal" : "Add school portal"} ↗
      </a>
      <a
        href={OUTLOOK_URL}
        target="_blank"
        rel="noreferrer"
        className="btn-ghost !px-3 !py-1.5 text-xs"
        title="Open your email in Outlook on the web"
      >
        📧 Outlook ↗
      </a>
    </div>
  );
}
