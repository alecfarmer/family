import { requireUser } from "@/lib/auth";
import { AskAlecButton } from "@/components/help/AskAlecButton";
import { HelpRequestCard } from "@/components/help/HelpRequestCard";

export default async function HelpPage() {
  const { user, sb } = await requireUser();

  const { data: requests } = await sb
    .from("help_requests")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const all = requests ?? [];

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Page header */}
      <div className="flex-shrink-0 bg-bg px-5 pb-3 pt-6">
        <h1
          className="font-display font-semibold text-text"
          style={{ fontSize: 34, letterSpacing: "0.01em" }}
        >
          Help
        </h1>
        <p className="font-sans text-[13.5px] text-text-2">
          When the AI can&apos;t, Alec can.
        </p>
      </div>

      {/* CTA */}
      <div className="flex-shrink-0 px-4 pb-3 pt-2">
        <AskAlecButton />
      </div>

      {/* Request list */}
      <div className="flex-1 overflow-auto px-4 pb-5">
        <p
          className="mb-2 mt-1 font-sans font-semibold uppercase text-text-3"
          style={{ fontSize: 10.5, letterSpacing: "0.14em" }}
        >
          Recent requests
        </p>

        {all.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="font-sans text-[14px] text-text-2">No requests yet.</p>
            <p className="mt-1 font-sans text-[13px] text-text-3">
              Tap &ldquo;Ask Alec&rdquo; any time you need a hand.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {all.map((req) => (
              <HelpRequestCard key={req.id} request={req} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
