import type { Enums } from "@/lib/supabase/types";

type IconFn = (color: string) => React.JSX.Element;

// SVGs verbatim from DEVICE_ICONS in the design source
const ICONS: Record<string, IconFn> = {
  tv: (c) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="13" rx="1.5" stroke={c} strokeWidth="1.6" />
      <path d="M9 20h6M12 17v3" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  router: (c) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="11" width="18" height="9" rx="1.5" stroke={c} strokeWidth="1.6" />
      <circle cx="7" cy="15.5" r="1" fill={c} />
      <circle cx="11" cy="15.5" r="1" fill={c} />
      <path
        d="M16 4c2 0 4 2 4 4M16 7c1 0 2 1 2 2"
        stroke={c}
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  ),
  thermo: (c) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="8.5" stroke={c} strokeWidth="1.6" />
      <circle cx="12" cy="12" r="3" stroke={c} strokeWidth="1.6" />
      <path
        d="M12 4v2M20 12h-2M12 20v-2M4 12h2"
        stroke={c}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  ),
  garage: (c) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 11v10h18V11l-9-6-9 6Z"
        stroke={c}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M6 14h12M6 17.5h12"
        stroke={c}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  ),
  speaker: (c) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="6" y="3" width="12" height="18" rx="2" stroke={c} strokeWidth="1.6" />
      <circle cx="12" cy="15" r="3.2" stroke={c} strokeWidth="1.6" />
      <circle cx="12" cy="7" r="1" fill={c} />
    </svg>
  ),
  laptop: (c) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="4" y="5" width="16" height="11" rx="1.5" stroke={c} strokeWidth="1.6" />
      <path d="M2 19h20" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
};

/**
 * Resolve a device type + name to an icon key.
 * Name-based substring matching takes priority so "Garage Opener" etc. work
 * regardless of how the type enum is set.
 */
export function resolveDeviceIconKey(
  type: Enums<"device_type">,
  name: string,
): keyof typeof ICONS {
  const lower = name.toLowerCase();

  if (lower.includes("garage")) return "garage";
  if (lower.includes("thermostat") || lower.includes("nest")) return "thermo";
  if (lower.includes("sonos") || lower.includes("speaker")) return "speaker";
  if (lower.includes("tv") || lower.includes("television")) return "tv";
  if (lower.includes("router") || lower.includes("eero") || lower.includes("orbi")) return "router";

  // Type-based fallback
  const typeMap: Record<Enums<"device_type">, keyof typeof ICONS> = {
    tv: "tv",
    router: "router",
    modem: "router",
    phone: "laptop",
    tablet: "laptop",
    laptop: "laptop",
    desktop: "laptop",
    smart_home: "thermo",
    other: "thermo",
  };

  return typeMap[type] ?? "thermo";
}

export function DeviceIcon({
  iconKey,
  color,
}: {
  iconKey: keyof typeof ICONS;
  color: string;
}) {
  const fn = ICONS[iconKey];
  return fn ? fn(color) : ICONS.thermo(color);
}
