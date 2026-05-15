import { redirect } from "next/navigation";

export default function Root() {
  // Member chat home lives at (member)/page.tsx — once auth is wired we redirect there.
  // Until then, redirect to /login so the build doesn't error during the foundation phase.
  redirect("/login");
}
