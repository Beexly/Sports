"use client";

/**
 * Persistent state hook backed by localStorage.
 * SSR-safe: returns initialValue on server.
 * Syncs across tabs via storage event.
 */

import { useCallback, useEffect, useState } from "react";

function readFromStorage<T>(key: string, initialValue: T): T {
  if (typeof window === "undefined") return initialValue;
  try {
    const item = window.localStorage.getItem(key);
    if (item === null) return initialValue;
    return JSON.parse(item) as T;
  } catch {
    return initialValue;
  }
}

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const [storedValue, setStoredValue] = useState<T>(() =>
    readFromStorage(key, initialValue)
  );

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const nextValue =
          typeof value === "function"
            ? (value as (prev: T) => T)(prev)
            : value;

        if (typeof window !== "undefined") {
          try {
            window.localStorage.setItem(key, JSON.stringify(nextValue));
          } catch {
            // localStorage may be unavailable (private mode, quota exceeded, etc.)
          }
        }

        return nextValue;
      });
    },
    [key]
  );

  const remove = useCallback(() => {
    setStoredValue(initialValue);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // localStorage may be unavailable
      }
    }
  }, [key, initialValue]);

  // Sync across tabs via storage event
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key !== key) return;

      if (event.newValue === null) {
        // Key was removed in another tab
        setStoredValue(initialValue);
      } else {
        try {
          setStoredValue(JSON.parse(event.newValue) as T);
        } catch {
          setStoredValue(initialValue);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [key, initialValue]);

  return [storedValue, setValue, remove];
}
