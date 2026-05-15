import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { logAccess } from "@/lib/accessLog";

// Single Claude vision call can take several seconds on a large photo.
export const maxDuration = 60;

const deviceTypes = [
  "tv",
  "router",
  "modem",
  "phone",
  "tablet",
  "laptop",
  "desktop",
  "smart_home",
  "other",
] as const;

const resultSchema = z.object({
  name: z
    .string()
    .describe(
      'A short, family-friendly label like "Living Room TV" or "Office Router". Default to "<Brand> <Type>" if you can\'t guess a placement.',
    ),
  type: z
    .enum(deviceTypes)
    .describe(
      "The device category. smart_home covers thermostats, smart speakers, smart plugs, smart bulbs, doorbells, security cams. Use 'other' only when nothing fits.",
    ),
  brand: z
    .string()
    .nullable()
    .describe("Manufacturer (e.g. LG, Samsung, eero, Nest). null if unknown."),
  model: z
    .string()
    .nullable()
    .describe(
      'Model number / name (e.g. "OLED C3", "Pro 6", "3rd Gen"). null if unknown.',
    ),
  serial_number: z
    .string()
    .nullable()
    .describe(
      "Serial number, only if clearly visible on a label in the image. Do NOT guess. null otherwise.",
    ),
  notes: z
    .string()
    .nullable()
    .describe(
      "One short sentence with anything useful for the household — placement hint, reset method, where the label was found. Keep under 140 chars. null if nothing meaningful to add.",
    ),
  confidence: z
    .enum(["high", "medium", "low"])
    .describe(
      "How sure you are about brand+model. 'low' if you're inferring from form factor alone.",
    ),
});

const bodySchema = z.object({
  // Either a data URL (data:image/jpeg;base64,...) or raw base64.
  image: z.string().min(64),
});

const SYSTEM = [
  "You are a device-identification assistant for a household-tech app.",
  "The user uploads a photo of a household device, its box, or its rating label.",
  "Identify the device and return a structured record.",
  "",
  "Rules:",
  "- Only fill fields when you have visual evidence. Set to null otherwise.",
  "- Do NOT invent or guess serial numbers — read them only when clearly legible.",
  "- 'name' should be human-friendly; the user can rename. Examples: 'Living Room TV', 'Office Router'.",
  "- 'type' must be exactly one of: tv, router, modem, phone, tablet, laptop, desktop, smart_home, other.",
  "- Notes should be short, factual, useful (placement hint, reset method, label location). No marketing copy.",
].join("\n");

export async function POST(req: Request) {
  await requireAdmin();

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_image" }, { status: 400 });
  }

  const { image } = parsed.data;

  try {
    const { object } = await generateObject({
      model: anthropic("claude-sonnet-4-6"),
      schema: resultSchema,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Identify this device.",
            },
            {
              type: "image",
              image,
            },
          ],
        },
      ],
    });

    await logAccess({
      action: "admin_device_scan",
      metadata: {
        brand: object.brand,
        model: object.model,
        confidence: object.confidence,
      },
    });

    return NextResponse.json(object);
  } catch (err) {
    const message = err instanceof Error ? err.message : "scan_failed";
    return NextResponse.json(
      { error: "scan_failed", detail: message },
      { status: 502 },
    );
  }
}
