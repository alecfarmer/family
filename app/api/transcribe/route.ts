import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { env } from "@/lib/env";

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB — Groq Whisper limit

export async function POST(req: Request) {
  await requireUser();

  const apiKey = env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "voice_not_configured" }, { status: 503 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart body" }, { status: 400 });
  }

  const audio = formData.get("audio");
  if (!(audio instanceof Blob)) {
    return NextResponse.json({ error: "Missing audio field" }, { status: 400 });
  }

  if (!audio.type.startsWith("audio/")) {
    return NextResponse.json(
      { error: `Unexpected content-type: ${audio.type}` },
      { status: 400 },
    );
  }

  if (audio.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Audio exceeds 25 MB limit" },
      { status: 413 },
    );
  }

  const groqForm = new FormData();
  groqForm.append("file", audio, "audio.webm");
  groqForm.append("model", "whisper-large-v3");
  groqForm.append("response_format", "text");

  const groqRes = await fetch(
    "https://api.groq.com/openai/v1/audio/transcriptions",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: groqForm,
    },
  );

  if (!groqRes.ok) {
    const detail = await groqRes.text().catch(() => "");
    console.error("[transcribe] Groq error", groqRes.status, detail);
    return NextResponse.json(
      { error: "Transcription failed" },
      { status: 502 },
    );
  }

  // response_format: "text" → plain string body
  const text = (await groqRes.text()).trim();
  return NextResponse.json({ text });
}
