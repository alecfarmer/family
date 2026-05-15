"use client";

import { useEffect, useState } from "react";
import { FamilyMark } from "@/components/brand/FamilyMark";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from(Array.from(raw, (c) => c.charCodeAt(0)));
}

export function PermissionPromptGate() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (
      typeof Notification === "undefined" ||
      Notification.permission !== "default"
    ) {
      return;
    }
    if (localStorage.getItem("familyPushDeclined") === "1") {
      return;
    }
    setVisible(true);
  }, []);

  async function handleAllow() {
    setVisible(false);
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;

    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) return;

      const keyBytes = urlBase64ToUint8Array(vapidKey);
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyBytes.buffer as ArrayBuffer,
      });

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
    } catch {
      // Non-fatal — SW registration or subscription may fail in unsupported browsers.
    }
  }

  function handleDeny() {
    localStorage.setItem("familyPushDeclined", "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal
      aria-label="Family notification permission"
      className="fixed inset-0 z-50"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/55" onClick={handleDeny} />

      {/* iOS-style alert */}
      <div
        className="absolute left-1/2 top-1/2 w-[282px] overflow-hidden rounded-[14px]"
        style={{
          transform: "translate(-50%, -50%)",
          background: "rgba(58,48,42,0.92)",
          backdropFilter: "blur(40px) saturate(180%)",
          WebkitBackdropFilter: "blur(40px) saturate(180%)",
          border: "0.5px solid rgba(255,255,255,0.12)",
          boxShadow: "0 30px 60px rgba(0,0,0,0.5)",
        }}
      >
        {/* Content */}
        <div
          className="px-[18px] pb-4 pt-5 text-center"
          style={{ borderBottom: "0.5px solid rgba(255,255,255,0.12)" }}
        >
          {/* App icon */}
          <div className="mb-3.5 flex justify-center">
            <div
              className="flex items-center justify-center overflow-hidden"
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: "#0F0D0B",
                border: "1px solid rgba(200,121,65,0.25)",
                boxShadow: "inset 0 0 14px rgba(200,121,65,0.18)",
              }}
            >
              <FamilyMark size={28} color="var(--color-accent)" />
            </div>
          </div>

          <p
            className="mb-1.5 font-sans font-semibold text-white"
            style={{ fontSize: 17, letterSpacing: "-0.01em" }}
          >
            &ldquo;Family&rdquo; Would Like to Send You Notifications
          </p>
          <p
            className="font-sans text-white/80"
            style={{ fontSize: 13, lineHeight: 1.35 }}
          >
            So you can hear back when Alec replies, when a credential is shared,
            or when a warranty needs attention.
          </p>
        </div>

        {/* Buttons */}
        <div className="grid grid-cols-2">
          <button
            onClick={handleDeny}
            className="py-[11px] px-3 font-sans font-normal text-[#E8A063] transition-opacity active:opacity-70"
            style={{
              fontSize: 16,
              borderRight: "0.5px solid rgba(255,255,255,0.12)",
              background: "none",
            }}
          >
            Don&rsquo;t Allow
          </button>
          <button
            onClick={handleAllow}
            className="py-[11px] px-3 font-sans font-semibold text-[#E8A063] transition-opacity active:opacity-70"
            style={{ fontSize: 16, background: "none" }}
          >
            Allow
          </button>
        </div>
      </div>
    </div>
  );
}
