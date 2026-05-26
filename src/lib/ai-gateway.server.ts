import { createAnthropic } from "@ai-sdk/anthropic";

export const createIntakeProvider = (apiKey: string) =>
  createAnthropic({ apiKey });
