/**
 * Cross-device sync using the user's own GitHub — no separate backend.
 *
 * Vela's whole state (the same JSON the "Export backup" button produces) is
 * stored in a single PRIVATE GitHub gist. Any device with the same token reads
 * and writes that gist, so your data follows you across phone, tablet, and
 * laptop. Last write wins — fine for one person across their own devices.
 *
 * The token + gist id live in their own localStorage key (never inside the
 * synced data, so the token is never uploaded). Use a token with only the
 * `gist` scope so a leak can't touch anything else.
 */

const API = "https://api.github.com";
const CFG_KEY = "vela-github";
export const GIST_FILE = "vela-data.json";
export const GIST_DESC = "Vela sync — your life data (private)";

export interface GhConfig {
  token: string;
  gistId: string;
  login: string;
  auto: boolean;
  /** updatedAt of the last version this device pushed or pulled. */
  lastSyncedAt?: string;
}

export function getGhConfig(): GhConfig | null {
  try {
    const raw = localStorage.getItem(CFG_KEY);
    return raw ? (JSON.parse(raw) as GhConfig) : null;
  } catch {
    return null;
  }
}

export function setGhConfig(cfg: GhConfig): void {
  try {
    localStorage.setItem(CFG_KEY, JSON.stringify(cfg));
  } catch {
    /* storage blocked */
  }
}

export function clearGhConfig(): void {
  try {
    localStorage.removeItem(CFG_KEY);
  } catch {
    /* ignore */
  }
}

async function gh(path: string, token: string, init: RequestInit = {}): Promise<unknown> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.headers ?? {}),
    },
  });
  if (res.status === 401) throw new Error("That token was rejected — check it and its `gist` scope.");
  if (!res.ok) throw new Error(`GitHub error ${res.status}. Try again in a moment.`);
  return res.json();
}

/** Confirm a token works and return the account login. */
export async function validateToken(token: string): Promise<string> {
  const user = (await gh("/user", token)) as { login?: string };
  if (!user.login) throw new Error("Couldn't read your GitHub account.");
  return user.login;
}

/** Find this account's Vela gist, or create a fresh private one. */
export async function findOrCreateGist(token: string): Promise<string> {
  const gists = (await gh("/gists?per_page=100", token)) as Array<{
    id: string;
    description?: string;
    files?: Record<string, unknown>;
  }>;
  const found = gists.find((g) => g.description === GIST_DESC || (g.files && GIST_FILE in g.files));
  if (found) return found.id;
  const created = (await gh("/gists", token, {
    method: "POST",
    body: JSON.stringify({
      description: GIST_DESC,
      public: false,
      files: { [GIST_FILE]: { content: pack(null) } },
    }),
  })) as { id: string };
  return created.id;
}

/** The gist file wraps the exported state with a timestamp. */
export function pack(stateJson: string | null): string {
  return JSON.stringify({ updatedAt: new Date().toISOString(), state: stateJson });
}

export interface Unpacked {
  updatedAt: string;
  state: string | null;
}

export function unpack(content: string): Unpacked | null {
  try {
    const o = JSON.parse(content) as { updatedAt?: string; state?: string | null };
    if (!o.updatedAt) return null;
    return { updatedAt: o.updatedAt, state: o.state ?? null };
  } catch {
    return null;
  }
}

/** Write the current state to the gist; returns the new updatedAt stamp. */
export async function pushState(token: string, gistId: string, stateJson: string): Promise<string> {
  const content = pack(stateJson);
  await gh(`/gists/${gistId}`, token, {
    method: "PATCH",
    body: JSON.stringify({ files: { [GIST_FILE]: { content } } }),
  });
  return (unpack(content) as Unpacked).updatedAt;
}

/** Read the latest state from the gist (null if the gist is empty). */
export async function pullState(token: string, gistId: string): Promise<Unpacked | null> {
  const g = (await gh(`/gists/${gistId}`, token)) as {
    files?: Record<string, { content?: string; truncated?: boolean; raw_url?: string }>;
  };
  const file = g.files?.[GIST_FILE];
  if (!file) return null;
  let content = file.content ?? "";
  if (file.truncated && file.raw_url) {
    content = await (await fetch(file.raw_url)).text();
  }
  return unpack(content);
}
