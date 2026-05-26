import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createIntakeProvider } from "./ai-gateway.server";

// Mirror the HelpType union from data.ts. Kept here so this file does not
// pull React imports through the server bundle.
const HELP_TYPE_VALUES = [
  "safe_shelter",
  "secure_travel",
  "supplies",
  "medical",
  "medical_supplies",
  "legal",
  "message_relay",
  "other",
] as const;

const IntakeSchema = z.object({
  help_type: z.enum(HELP_TYPE_VALUES).describe("Best-fit help category from the fixed list."),
  urgency: z.enum(["low", "medium", "high"]).describe("Severity: high for life-safety or time-critical."),
  area_label: z
    .string()
    .max(80)
    .describe("Short neighborhood / landmark hint, no exact address or PII. Empty string if unclear."),
  notes: z
    .string()
    .max(500)
    .describe(
      "Concise paraphrase of what the person needs. Strip names, phone numbers, exact addresses, and any other identifying info.",
    ),
});

export type ParsedIntake = z.infer<typeof IntakeSchema>;

const SYSTEM_PROMPT = `You are a privacy-first intake assistant for a peer-to-peer mutual aid app called Low Signal.
A person speaks a free-form description of help they need; you turn it into a structured request.

RULES:
- Pick the single best help_type from the allowed enum. If a request mentions medicine/medication, prefer "medical_supplies". If they need a person with medical training, use "medical".
- urgency=high only for life-safety, injury, immediate danger, or hard time deadlines (next few hours). urgency=medium is the default. urgency=low for non-time-critical.
- area_label: a short hint like "north district near market" or "Building 5". NEVER include full street addresses, apartment numbers, names of people, phone numbers, or other identifying details. If no location was mentioned, return "".
- notes: paraphrase what they need in 1-3 short sentences. STRIP all names, phone numbers, exact addresses, identification numbers, and anything that could identify the person or their contacts. Keep it operationally useful for a volunteer.
- Never invent facts. If the speech is unclear, leave fields empty or use "other".`;

export const parseIntake = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ transcript: z.string().min(1).max(4000) }).parse(input))
  .handler(async ({ data }) => {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error("Missing ANTHROPIC_API_KEY");

    const provider = createIntakeProvider(key);
    const model = provider("claude-haiku-4-5");

    try {
      const { output } = await generateText({
        model,
        system: SYSTEM_PROMPT,
        prompt: `Transcript:\n${data.transcript}`,
        output: Output.object({ schema: IntakeSchema }),
      });
      return output as ParsedIntake;
    } catch (e) {
      const msg = (e as Error).message || "Parse failed";
      throw new Error(msg);
    }
  });
