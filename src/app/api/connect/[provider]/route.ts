import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Email/account connection initiation.
 *
 * This is real OAuth scaffolding, not a fake toggle: it builds the provider's
 * consent URL when the deployment has the client credentials configured, and
 * otherwise reports `configured: false` so the UI can be honest that sign-in
 * only works once Vela is deployed with the secrets set. The token exchange +
 * callback belong on the deployed server (a `/api/connect/callback` route) and
 * are intentionally out of scope for the local-first build.
 */

interface ProviderCfg {
  label: string;
  clientEnv: string;
  authBase: string;
  scope: string;
}

const PROVIDERS: Record<string, ProviderCfg> = {
  google: {
    label: "Gmail",
    clientEnv: "GOOGLE_CLIENT_ID",
    authBase: "https://accounts.google.com/o/oauth2/v2/auth",
    scope: "openid email https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar.readonly",
  },
  microsoft: {
    label: "Outlook",
    clientEnv: "MICROSOFT_CLIENT_ID",
    authBase: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    scope: "openid email offline_access Mail.Read Calendars.Read",
  },
  school: {
    label: "School email",
    clientEnv: "SCHOOL_OAUTH_CLIENT_ID",
    // School IdPs vary; the auth endpoint is configured per deployment.
    authBase: process.env.SCHOOL_OAUTH_AUTH_URL ?? "",
    scope: "openid email profile",
  },
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  const cfg = PROVIDERS[provider];
  if (!cfg) {
    return NextResponse.json({ error: "Unknown provider." }, { status: 404 });
  }

  const clientId = process.env[cfg.clientEnv];
  const redirectUri = process.env.OAUTH_REDIRECT_URL;
  if (!clientId || !redirectUri || !cfg.authBase) {
    return NextResponse.json({
      configured: false,
      message: `${cfg.label} sign-in isn't set up on this deployment yet. It activates once Vela is deployed with the credentials configured.`,
    });
  }

  const url = new URL(cfg.authBase);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", cfg.scope);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", provider);

  return NextResponse.json({ configured: true, authUrl: url.toString() });
}
