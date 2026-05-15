import { requireAdmin } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { DevicesClient } from "./DevicesClient";

export default async function AdminDevicesPage() {
  const { sb } = await requireAdmin();

  const [devicesResult, householdsResult] = await Promise.all([
    sb
      .from("devices")
      .select("*, households(name)")
      .order("created_at", { ascending: false }),
    sb.from("households").select("id, name").order("name"),
  ]);

  // Flatten the joined household name
  const devices = (devicesResult.data ?? []).map((d) => {
    const householdName =
      d.households && !Array.isArray(d.households)
        ? (d.households as { name: string }).name
        : "Unknown";
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { households: _h, ...rest } = d;
    return { ...rest, household_name: householdName };
  });

  const households = (householdsResult.data ?? []).map((h) => ({
    id: h.id,
    name: h.name,
  }));

  return (
    <div className="min-h-dvh bg-bg">
      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* Page header */}
        <div className="mb-6">
          <a
            href="/admin"
            className="mb-3 inline-block font-sans text-xs text-text-3 hover:text-text-2"
          >
            ← Admin
          </a>
          <h1 className="font-display text-[28px] font-semibold text-text">
            Devices
          </h1>
          <p className="mt-1 font-sans text-sm text-text-2">
            {devices.length} device{devices.length !== 1 ? "s" : ""} across all
            households
          </p>
        </div>

        <DevicesClient devices={devices} households={households} />
      </div>
    </div>
  );
}
