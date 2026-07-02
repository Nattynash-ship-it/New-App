import { useEffect, useState } from "react";

/**
 * Returns true only after the first client render, so pages backed by the
 * persisted store never mismatch the server-rendered HTML.
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
