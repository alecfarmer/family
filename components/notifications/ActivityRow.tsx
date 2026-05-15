import { FamilyMark } from "@/components/brand/FamilyMark";

export type ActivityKind = "reply" | "share" | "warning" | "login" | "chat" | "household";
export type ActivityTone = "accent" | "success" | "warning" | "chat" | "admin";

export type ActivityItem = {
  id: string;
  kind: ActivityKind;
  tone: ActivityTone;
  title: string;
  body: string;
  meta: string;
  time: string;
  unread: boolean;
};

const TONE_HEX: Record<ActivityTone, string> = {
  accent: "#C87941",
  success: "#5C8F6A",
  warning: "#B8832A",
  chat: "#7B9EC8",
  admin: "#9D7BC8",
};

function ActivityIcon({
  kind,
  color,
}: {
  kind: ActivityKind;
  color: string;
}) {
  switch (kind) {
    case "reply":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M9 8L4 13l5 5M4 13h12a4 4 0 0 1 4 4v3"
            stroke={color}
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "share":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 4v12M7 9l5-5 5 5M5 18v2h14v-2"
            stroke={color}
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "warning":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 4l9 16H3l9-16Z"
            stroke={color}
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          <path
            d="M12 11v4M12 17.5v.5"
            stroke={color}
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
      );
    case "login":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="9" r="3.5" stroke={color} strokeWidth="1.7" />
          <path
            d="M5 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5"
            stroke={color}
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
      );
    case "chat":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M4 6.5C4 5.12 5.12 4 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8a2.5 2.5 0 0 1-2.5 2.5H9l-4 3.5v-3.5h-.5A2.5 2.5 0 0 1 2 14.5v-8"
            stroke={color}
            strokeWidth="1.7"
          />
        </svg>
      );
    case "household":
      return <FamilyMark size={18} color={color} />;
  }
}

export function ActivityRow({ item }: { item: ActivityItem }) {
  const hex = TONE_HEX[item.tone];
  const tileBg = `${hex}1A`;
  const tileBorder = `${hex}40`;

  return (
    <div
      className="relative flex gap-3 rounded-[14px] border p-[12px_14px_12px_16px]"
      style={{
        background: item.unread ? "rgba(200,121,65,0.04)" : "var(--color-surface)",
        borderColor: item.unread ? "rgba(200,121,65,0.30)" : "var(--color-border)",
        boxShadow: item.unread
          ? "inset 0 0 24px rgba(200,121,65,0.06)"
          : undefined,
      }}
    >
      {/* Unread indicator dot on outside-left edge */}
      {item.unread && (
        <div
          className="absolute top-4 rounded-full"
          style={{
            left: -3,
            width: 6,
            height: 6,
            background: "var(--color-accent)",
            boxShadow: "0 0 8px var(--color-accent)",
          }}
        />
      )}

      {/* Icon tile */}
      <div
        className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-[10px]"
        style={{ background: tileBg, border: `1px solid ${tileBorder}` }}
      >
        <ActivityIcon kind={item.kind} color={hex} />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex items-baseline justify-between gap-2">
          <p className="font-sans text-[14px] font-semibold leading-[1.25] text-text">
            {item.title}
          </p>
          <span className="flex-shrink-0 font-sans text-[11px] text-text-3">
            {item.time}
          </span>
        </div>

        <p className="mb-1.5 font-sans text-[13px] leading-[1.4] text-text-2">
          {item.body}
        </p>

        <p
          className="font-sans font-semibold uppercase"
          style={{ fontSize: 10.5, letterSpacing: "0.12em", color: hex }}
        >
          {item.meta}
        </p>
      </div>
    </div>
  );
}
