// Vercel project configuration — typed alternative to vercel.json
// https://vercel.com/docs/project-configuration/vercel-ts
import type { VercelConfig } from "@vercel/config/v1";

const config: VercelConfig = {
  framework: "nextjs",
  // Daily renegotiation reminder sweep. Vercel runs the cron in UTC —
  // 13:00 UTC = 8 AM Eastern (the time admins are most likely sitting at
  // their phone). The endpoint validates Bearer CRON_SECRET before doing
  // anything visible to the user.
  crons: [
    {
      path: "/api/cron/renegotiation-check",
      schedule: "0 13 * * *",
    },
  ],
  headers: [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=()",
        },
      ],
    },
    {
      source: "/sw.js",
      headers: [
        { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
        { key: "Service-Worker-Allowed", value: "/" },
      ],
    },
  ],
};

export default config;
