"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CopyToast } from "./CopyToast";

type CopyToastContextValue = {
  showCopyToast: (label?: string) => void;
};

const CopyToastContext = createContext<CopyToastContextValue | null>(null);

const DISMISS_MS = 30_000;

export function CopyToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ id: number; label: string } | null>(
    null,
  );
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showCopyToast = useCallback((label = "Password copied") => {
    if (timerRef.current) clearTimeout(timerRef.current);

    setToast({ id: Date.now(), label });

    timerRef.current = setTimeout(() => {
      setToast(null);
      timerRef.current = null;
    }, DISMISS_MS);
  }, []);

  return (
    <CopyToastContext.Provider value={{ showCopyToast }}>
      {children}
      {toast && <CopyToast key={toast.id} label={toast.label} />}
    </CopyToastContext.Provider>
  );
}

export function useCopyToast(): (label?: string) => void {
  const ctx = useContext(CopyToastContext);
  if (!ctx) {
    throw new Error("useCopyToast must be used within CopyToastProvider");
  }
  return ctx.showCopyToast;
}

/**
 * Copies `value` to the clipboard, shows the copy toast,
 * and schedules a clipboard clear after 30 seconds.
 * The clear is skipped if the clipboard value has changed in the meantime.
 */
export function copyAndToast(
  value: string,
  label: string | undefined,
  showCopyToast: (label?: string) => void,
): void {
  navigator.clipboard.writeText(value).then(() => {
    showCopyToast(label);

    setTimeout(async () => {
      try {
        const current = await navigator.clipboard.readText();
        if (current === value) {
          await navigator.clipboard.writeText("");
        }
      } catch {
        // readText may be denied (permission or focus loss) — skip silently.
      }
    }, DISMISS_MS);
  });
}
