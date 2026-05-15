import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { DeviceIcon, resolveDeviceIconKey } from "./DeviceIcons";
import type { Tables } from "@/lib/supabase/types";

type Device = Tables<"devices"> & {
  household_name?: string | null;
};

function resolveWarrantyBadge(
  warrantyExpiry: string | null,
  today: Date,
): { tone: "success" | "warning" | "danger" | "neutral"; label: string } {
  if (!warrantyExpiry) return { tone: "neutral", label: "No warranty" };

  const expiry = new Date(warrantyExpiry);
  const diffMs = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / 86_400_000);

  if (diffDays < 0) return { tone: "danger", label: "Expired" };
  if (diffDays <= 60) return { tone: "warning", label: `${diffDays}d left` };
  return { tone: "success", label: "Active" };
}

type DeviceCardProps = {
  device: Device;
  /** Show the household name as a small chip below the warranty badge. */
  showHouseholdChip?: boolean;
};

export function DeviceCard({ device, showHouseholdChip }: DeviceCardProps) {
  const today = new Date();
  const iconKey = resolveDeviceIconKey(device.type, device.name);
  const warranty = resolveWarrantyBadge(device.warranty_expiry, today);

  const brandModel = [device.brand, device.model].filter(Boolean).join(" ");

  return (
    <Link
      href={`/devices/${device.id}`}
      className="flex min-h-[130px] flex-col gap-2.5 rounded-[14px] border border-border bg-surface p-[14px_12px] transition-colors active:bg-surface-elevated"
    >
      {/* Icon tile */}
      <div
        className="flex h-[38px] w-[38px] items-center justify-center rounded-[10px] border border-accent/[0.20]"
        style={{ background: "rgba(200,121,65,0.08)" }}
      >
        <DeviceIcon iconKey={iconKey} color="var(--color-accent)" />
      </div>

      {/* Name + brand/model */}
      <div>
        <p className="font-sans text-[14px] font-semibold leading-[1.25] text-text">
          {device.name}
        </p>
        {brandModel && (
          <p className="mt-0.5 font-sans text-[12px] text-text-2">{brandModel}</p>
        )}
      </div>

      {/* Warranty badge + (optional) household chip pinned to bottom */}
      <div className="mt-auto flex flex-wrap items-center gap-1.5">
        <Badge tone={warranty.tone}>{warranty.label}</Badge>
        {showHouseholdChip && device.household_name && (
          <Badge tone="neutral">{device.household_name}</Badge>
        )}
      </div>
    </Link>
  );
}
