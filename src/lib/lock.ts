/**
 * On-device passcode lock. Vela is local-first — your data never leaves the
 * device — so "login" here means a passcode that gates the app on THIS device,
 * not a cloud account. The passcode is never stored: we keep only a PBKDF2 hash
 * + random salt (Web Crypto), so even the stored value can't reveal it.
 *
 * Kept in its own localStorage key (not the exported data store), so it's
 * device-specific and never travels in a backup.
 */

const LOCK_KEY = "vela-lock";
const UNLOCK_KEY = "vela-unlocked"; // session flag — cleared when the tab closes
const ITERATIONS = 150_000;

interface LockRecord {
  salt: string; // base64
  hash: string; // base64
  hint?: string;
  createdAt: string;
}

function toB64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}
function fromB64(s: string): Uint8Array {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

async function derive(passcode: string, salt: Uint8Array): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passcode),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: ITERATIONS, hash: "SHA-256" },
    key,
    256,
  );
  return toB64(bits);
}

function readRecord(): LockRecord | null {
  try {
    const raw = localStorage.getItem(LOCK_KEY);
    return raw ? (JSON.parse(raw) as LockRecord) : null;
  } catch {
    return null;
  }
}

/** True when a passcode has been set on this device. */
export function isLockSet(): boolean {
  return readRecord() !== null;
}

/** The optional hint the user saved with their passcode. */
export function lockHint(): string | undefined {
  return readRecord()?.hint;
}

/** Whether crypto is available (older/insecure contexts can't hash). */
export function lockSupported(): boolean {
  return typeof crypto !== "undefined" && !!crypto.subtle;
}

export async function setPasscode(passcode: string, hint?: string): Promise<void> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(passcode, salt);
  const record: LockRecord = {
    salt: toB64(salt.buffer),
    hash,
    createdAt: new Date().toISOString(),
    ...(hint?.trim() ? { hint: hint.trim() } : {}),
  };
  localStorage.setItem(LOCK_KEY, JSON.stringify(record));
  setUnlocked(true);
}

export async function verifyPasscode(passcode: string): Promise<boolean> {
  const record = readRecord();
  if (!record) return false;
  const hash = await derive(passcode, fromB64(record.salt));
  const ok = hash === record.hash;
  if (ok) setUnlocked(true);
  return ok;
}

/** Remove the passcode entirely — requires the current one to have been verified. */
export function clearPasscode(): void {
  localStorage.removeItem(LOCK_KEY);
  setUnlocked(true);
}

export function isUnlocked(): boolean {
  try {
    return sessionStorage.getItem(UNLOCK_KEY) === "1";
  } catch {
    return true; // if storage is blocked, don't hard-lock the user out
  }
}

export function setUnlocked(on: boolean): void {
  try {
    if (on) sessionStorage.setItem(UNLOCK_KEY, "1");
    else sessionStorage.removeItem(UNLOCK_KEY);
  } catch {
    /* storage blocked — session stays unlocked */
  }
}

export function lock(): void {
  setUnlocked(false);
}
