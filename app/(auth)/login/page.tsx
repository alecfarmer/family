import { FamilyMark } from "@/components/brand/FamilyMark";
import { Wordmark } from "@/components/brand/Wordmark";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign in · Family" };

export default function LoginPage() {
  return (
    <div className="relative flex min-h-dvh flex-col bg-bg">
      {/* Ambient radial glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 40%, rgba(200,121,65,0.15) 0%, transparent 60%)",
        }}
      />

      {/* Centered content */}
      <div className="relative z-10 flex flex-1 flex-col justify-center px-7">
        {/* Branding */}
        <div className="mb-9 flex flex-col items-center">
          <div
            className="mb-[18px]"
            style={{
              filter: "drop-shadow(0 0 18px rgba(200,121,65,0.15))",
            }}
          >
            <FamilyMark size={56} color="var(--color-accent)" />
          </div>
          <Wordmark size={28} />
        </div>

        {/* Form card */}
        <LoginForm />

        {/* Footer */}
        <p
          className="mt-[18px] text-center font-sans text-text-3"
          style={{ fontSize: 11.5, letterSpacing: "0.02em" }}
        >
          Only pre-approved family members can sign in.
        </p>
      </div>
    </div>
  );
}
