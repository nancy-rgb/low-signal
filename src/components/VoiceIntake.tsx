import { useEffect, useState } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { useDictation, voiceSupported } from "@/lib/voice";
import { parseIntake, type ParsedIntake } from "@/lib/intake.functions";

interface Props {
  onParsed: (intake: ParsedIntake, transcript: string) => void;
}

/**
 * Conversational voice intake: user taps Speak, talks freely, and Lovable AI
 * extracts a structured request. The transcript stays on-device until the
 * user submits; only the cleaned, PII-stripped paraphrase is sent.
 */
export function VoiceIntake({ onParsed }: Props) {
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { listening, error: dictError, start, stop, supported } = useDictation({
    onFinal: (t) => setTranscript((s) => (s ? s + " " : "") + t),
    onInterim: (t) => setInterim(t),
  });

  useEffect(() => {
    if (!listening) setInterim("");
  }, [listening]);

  if (!supported && !voiceSupported()) return null;

  async function submit() {
    if (!transcript.trim()) return;
    setError(null);
    setParsing(true);
    try {
      const result = await parseIntake({ data: { transcript: transcript.trim() } });
      onParsed(result, transcript.trim());
    } catch (e) {
      setError((e as Error).message || "Could not parse what you said. Try again or use the form.");
    } finally {
      setParsing(false);
    }
  }

  const shown = transcript + (interim ? (transcript ? " " : "") + interim : "");

  return (
    <section
      className="rounded-md border border-input bg-card p-3 text-sm"
      aria-labelledby="voice-intake-heading"
    >
      <div id="voice-intake-heading" className="mb-1 font-medium">
        Or just talk
      </div>
      <p className="text-xs text-muted-foreground">
        Tap, describe what you need in your own words, then tap again to stop. Lovable AI will fill the form
        for you to review. We strip names and contact details before sending.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={listening ? stop : start}
          disabled={parsing}
          aria-pressed={listening}
          className={`inline-flex min-h-11 items-center gap-2 rounded-md border px-3 py-2 text-sm ${
            listening
              ? "border-destructive bg-destructive/10 text-destructive animate-pulse"
              : "border-input bg-background"
          } disabled:opacity-50`}
        >
          {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          <span>{listening ? "Listening — tap to stop" : "Speak your request"}</span>
        </button>

        {transcript && !listening && (
          <button
            type="button"
            onClick={submit}
            disabled={parsing}
            className="inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {parsing && <Loader2 className="h-4 w-4 animate-spin" />}
            {parsing ? "Parsing…" : "Fill the form"}
          </button>
        )}

        {transcript && !listening && !parsing && (
          <button
            type="button"
            onClick={() => {
              setTranscript("");
              setError(null);
            }}
            className="text-xs text-muted-foreground underline"
          >
            Clear
          </button>
        )}
      </div>

      {shown && (
        <div
          className="mt-2 rounded-md border border-input bg-background p-2 text-xs text-muted-foreground"
          aria-live="polite"
        >
          {shown}
        </div>
      )}
      {(error || dictError) && (
        <p className="mt-2 text-xs text-destructive" role="status">
          {error || dictError}
        </p>
      )}
    </section>
  );
}
