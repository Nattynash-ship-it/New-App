import { NextResponse } from "next/server";
import type { DeliveryService, GroceryItem } from "@/core/types";

export const runtime = "nodejs";

/**
 * Grocery delivery integration placeholder.
 *
 * Receives the structured grocery list and routes it to an external delivery
 * service. Whole Foods (Amazon) and Aldi (Instacart) don't offer public
 * cart-creation APIs today, so this endpoint:
 *   1. validates + normalizes the payload into a stable schema, and
 *   2. forwards it to a configurable webhook URL per service
 *      (WHOLE_FOODS_WEBHOOK_URL / ALDI_WEBHOOK_URL — e.g. a Zapier/Make
 *      automation or a future partner API) when configured.
 *
 * The payload shape is the integration contract; swapping in a real partner
 * API later only changes the forwarding step.
 */

const SERVICE_ENV: Record<DeliveryService, string | undefined> = {
  whole_foods: process.env.WHOLE_FOODS_WEBHOOK_URL,
  aldi: process.env.ALDI_WEBHOOK_URL,
};

interface GroceryWebhookBody {
  service?: unknown;
  items?: unknown;
}

export async function POST(request: Request) {
  let service: DeliveryService;
  let items: Array<Pick<GroceryItem, "name" | "quantity" | "category">>;

  try {
    const body = (await request.json()) as GroceryWebhookBody;
    if (body.service !== "whole_foods" && body.service !== "aldi") {
      return NextResponse.json(
        { error: "`service` must be 'whole_foods' or 'aldi'." },
        { status: 400 },
      );
    }
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: "`items` must be a non-empty array." }, { status: 400 });
    }
    service = body.service;
    items = (body.items as GroceryItem[]).map((i) => ({
      name: String(i.name),
      quantity: String(i.quantity ?? "1"),
      category: i.category ?? "pantry",
    }));
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const payload = {
    version: 1,
    service,
    submittedAt: new Date().toISOString(),
    itemCount: items.length,
    items,
  };

  const targetUrl = SERVICE_ENV[service];
  if (!targetUrl) {
    // Placeholder mode: acknowledge and echo the normalized order so the UI
    // can confirm the flow end-to-end before a real integration exists.
    return NextResponse.json({
      status: "queued_placeholder",
      message: `No ${service} webhook configured yet — order captured locally.`,
      order: payload,
    });
  }

  try {
    const res = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Upstream responded ${res.status}`);
    return NextResponse.json({ status: "forwarded", order: payload });
  } catch (err) {
    console.error(`Grocery webhook forward to ${service} failed:`, err);
    return NextResponse.json(
      { status: "error", message: "Delivery service unreachable — try again later." },
      { status: 502 },
    );
  }
}
