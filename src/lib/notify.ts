/**
 * Notification plumbing that actually works on iPhone/iPad.
 *
 * The important quirk: iOS/iPadOS does NOT support the `new Notification(...)`
 * constructor. Safari there only shows notifications via
 * `ServiceWorkerRegistration.showNotification()`, and only once the site has
 * been added to the Home Screen (installed) on iOS 16.4+. In a plain Safari
 * tab `window.Notification` is undefined entirely.
 *
 * So: always prefer the service worker, fall back to the constructor on
 * desktop, and give the UI enough detail to explain *why* it isn't working.
 */

export type NotifyPermission = "granted" | "denied" | "default" | "unsupported";

export function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notifyPermission(): NotifyPermission {
  if (!notificationsSupported()) return "unsupported";
  return Notification.permission as NotifyPermission;
}

/** True for iPhone/iPad — including iPadOS, which reports itself as a Mac. */
export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (/Mac/.test(ua) && typeof document !== "undefined" && navigator.maxTouchPoints > 1)
  );
}

/** True when running as an installed app (Home Screen / standalone window). */
export function isInstalled(): boolean {
  if (typeof window === "undefined") return false;
  const standaloneIOS = (navigator as { standalone?: boolean }).standalone === true;
  return standaloneIOS || window.matchMedia?.("(display-mode: standalone)").matches === true;
}

/**
 * Why notifications can't work right now, or null if they can. Used to show an
 * honest explanation instead of a silent no-op.
 */
export function notifyBlocker(): string | null {
  if (!notificationsSupported()) {
    return isIOS() && !isInstalled()
      ? "On iPhone/iPad, reminders only work once Vela is added to your Home Screen. Tap Share → Add to Home Screen, then open Vela from that icon."
      : "This browser doesn't support notifications.";
  }
  if (notifyPermission() === "denied") {
    return "Notifications are blocked for Vela. Allow them in your browser/system settings, then try again.";
  }
  if (isIOS() && !isInstalled()) {
    return "On iPhone/iPad, open Vela from its Home Screen icon for reminders to fire.";
  }
  return null;
}

/** Ask for permission (must be called from a tap/click). */
export async function requestNotifyPermission(): Promise<NotifyPermission> {
  if (!notificationsSupported()) return "unsupported";
  try {
    return (await Notification.requestPermission()) as NotifyPermission;
  } catch {
    return "denied";
  }
}

/**
 * Show a notification. Uses the service worker registration first (required on
 * iOS, and the only way a notification survives the page being backgrounded),
 * falling back to the constructor elsewhere. Returns whether it was shown.
 */
export async function showNotification(
  title: string,
  options: NotificationOptions = {},
): Promise<boolean> {
  if (notifyPermission() !== "granted") return false;
  const opts: NotificationOptions = { icon: "/icons/icon-192.png", badge: "/icons/icon-192.png", ...options };

  if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, opts);
      return true;
    } catch {
      // fall through to the constructor below
    }
  }
  try {
    new Notification(title, opts);
    return true;
  } catch {
    return false;
  }
}
