// Types and constants for the login flow. Kept out of actions.ts because
// Next.js "use server" files can only export async functions.

export type LoginState = {
  step: "email" | "code";
  email?: string;
  error?: string;
  sentAt?: number; // epoch ms — lets the client show a "resend in Ns" countdown
};

export const initialLoginState: LoginState = { step: "email" };
