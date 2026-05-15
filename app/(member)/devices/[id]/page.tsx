import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { Badge } from "@/components/ui/Badge";
import { supabaseService } from "@/lib/supabase/service";
import { AttachmentSection } from "@/components/devices/AttachmentSection";
import {
  DEVICE_ATTACHMENTS_BUCKET,
  SIGNED_URL_TTL_SECONDS,
  canManageDeviceAttachments,
  type DeviceAttachmentListItem,
  type DeviceAttachmentRow,
} from "@/lib/deviceAttachments";

type Props = {
  params: Promise<{ id: string }>;
};

function CredRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-1 rounded-[12px] border border-border bg-surface p-[12px_14px]">
      <span
        className="font-sans font-semibold uppercase text-text-3"
        style={{ fontSize: 10.5, letterSpacing: "0.12em" }}
      >
        {label}
      </span>
      <span className="font-sans text-[14px] text-text">{value}</span>
    </div>
  );
}

export default async function DeviceDetailPage({ params }: Props) {
  const { id } = await params;
  const { sb } = await requireUser();

  const { data: device } = await sb
    .from("devices")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!device) notFound();

  // Server-fetch attachments + generate signed URLs here so the client
  // component receives ready-to-render data on first paint. RLS on
  // device_attachments filters to rows the current user can see.
  const { data: attachmentData } = await sb
    .from("device_attachments" as never)
    .select(
      "id, device_id, storage_path, file_name, mime_type, size_bytes, uploaded_by, created_at",
    )
    .eq("device_id", id)
    .order("created_at", { ascending: false });

  const attachmentRows = (attachmentData ?? []) as unknown as DeviceAttachmentRow[];
  const signed = await Promise.all(
    attachmentRows.map((row) =>
      supabaseService.storage
        .from(DEVICE_ATTACHMENTS_BUCKET)
        .createSignedUrl(row.storage_path, SIGNED_URL_TTL_SECONDS),
    ),
  );
  const initialAttachments: DeviceAttachmentListItem[] = attachmentRows.map(
    (row, idx) => ({
      id: row.id,
      file_name: row.file_name,
      mime_type: row.mime_type,
      size_bytes: row.size_bytes,
      created_at: row.created_at,
      url: signed[idx]?.data?.signedUrl ?? "",
    }),
  );

  const { allowed: canManageAttachments } = await canManageDeviceAttachments(id);

  const today = new Date();
  const expiry = device.warranty_expiry ? new Date(device.warranty_expiry) : null;
  const diffDays = expiry
    ? Math.ceil((expiry.getTime() - today.getTime()) / 86_400_000)
    : null;

  let warrantyTone: "success" | "warning" | "danger" | "neutral" = "neutral";
  let warrantyLabel = "No warranty";
  if (expiry && diffDays !== null) {
    if (diffDays < 0) {
      warrantyTone = "danger";
      warrantyLabel = "Expired";
    } else if (diffDays <= 60) {
      warrantyTone = "warning";
      warrantyLabel = `${diffDays} days left`;
    } else {
      warrantyTone = "success";
      warrantyLabel = "Active";
    }
  }

  const purchaseDateLabel = device.purchase_date
    ? new Date(device.purchase_date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  const warrantyExpiryLabel = expiry
    ? expiry.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header with back button */}
      <div className="flex-shrink-0 bg-bg px-4 pb-4 pt-5">
        <Link
          href="/devices"
          className="mb-4 flex items-center gap-1.5 font-sans text-[14px] text-text-2 active:text-text"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M15 5L8 12l7 7"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Devices
        </Link>

        <div className="flex items-start justify-between gap-3">
          <h1
            className="font-display font-semibold text-text"
            style={{ fontSize: 28, letterSpacing: "0.01em" }}
          >
            {device.name}
          </h1>
          <Badge tone={warrantyTone}>{warrantyLabel}</Badge>
        </div>

        {(device.brand || device.model) && (
          <p className="mt-1 font-sans text-[13.5px] text-text-2">
            {[device.brand, device.model].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>

      {/* Detail rows */}
      <div className="flex-1 overflow-auto px-4 pb-8">
        <div className="flex flex-col gap-2.5">
          <CredRow label="Type" value={device.type} />
          <CredRow label="Brand" value={device.brand} />
          <CredRow label="Model" value={device.model} />
          <CredRow label="Serial Number" value={device.serial_number} />
          <CredRow label="Purchase Date" value={purchaseDateLabel} />
          <CredRow label="Warranty Expiry" value={warrantyExpiryLabel} />
          <CredRow label="Notes" value={device.notes} />
        </div>

        <AttachmentSection
          deviceId={id}
          initialAttachments={initialAttachments}
          canManage={canManageAttachments}
        />
      </div>
    </div>
  );
}
