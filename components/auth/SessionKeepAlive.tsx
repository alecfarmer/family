"use client";

import { useEffect } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

/**
 * Keeps the Supabase session refreshed while the PWA is open.
 *
 * The browser client has `autoRefreshToken: true` by default, but on iOS PWAs
 * the JS timer can be frozen for hours while the app is backgrounded — by the
 * time the user taps the icon again, the 1-hour access token is already
 * expired and middleware bounces them to /login before refresh can run.
 *
 * We force a `refreshSession()` whenever the tab returns to the foreground so
 * the cookies are minted *before* the next navigation hits middleware.
 */
export function SessionKeepAlive() {
  useEffect(() => {
    const sb = supabaseBrowser();

    const refresh = () => {
      void sb.auth.refreshSession();
    };

    refresh();

    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", refresh);
    window.addEventListener("pageshow", refresh);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("pageshow", refresh);
    };
  }, []);

  return null;
}
