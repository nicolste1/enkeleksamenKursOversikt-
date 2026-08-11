"use client";

// localStorage-backed state that is hydration-safe without effect-driven
// setState (react-hooks/set-state-in-effect): useSyncExternalStore renders the
// server fallback during hydration, then re-reads storage on the client.
// Same-tab updates notify via a module-level listener set; cross-tab updates
// arrive through the browser's storage event.

import { useCallback, useRef, useSyncExternalStore } from "react";

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function useLocalStorage<T>(
  key: string,
  fallback: T,
): [T, (next: T) => void] {
  // Cache keyed on the raw string so getSnapshot returns a stable reference
  // (a fresh JSON.parse per call would loop useSyncExternalStore forever).
  const cache = useRef<{ raw: string | null; value: T }>({
    raw: null,
    value: fallback,
  });

  const subscribe = useCallback(
    (onChange: () => void) => {
      listeners.add(onChange);
      const onStorage = (event: StorageEvent) => {
        if (event.key === key) onChange();
      };
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(onChange);
        window.removeEventListener("storage", onStorage);
      };
    },
    [key],
  );

  const getSnapshot = useCallback((): T => {
    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(key);
    } catch {
      raw = null;
    }
    if (raw === cache.current.raw) return cache.current.value;
    let value = fallback;
    if (raw !== null) {
      try {
        const parsed: unknown = JSON.parse(raw);
        // Guard against stale/foreign stored values ("null", wrong type):
        // anything that doesn't match the fallback's shape is discarded.
        if (parsed !== null && typeof parsed === typeof fallback) {
          value = parsed as T;
        }
      } catch {
        // Malformed JSON: keep the fallback.
      }
    }
    cache.current = { raw, value };
    return value;
    // fallback is intentionally not a dependency: callers pass constants.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const getServerSnapshot = useCallback((): T => fallback, [fallback]);

  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const set = useCallback(
    (next: T) => {
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // Storage blocked/full: the preference simply won't persist.
      }
      emit();
    },
    [key],
  );

  return [value, set];
}
