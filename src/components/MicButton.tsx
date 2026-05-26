import { Mic, MicOff } from "lucide-react";
import { useDictation } from "@/lib/voice";

interface Props {
  onTranscript: (text: string) => void;
  label?: string;
  className?: string;
}

/** Compact mic button that dictates speech into a text field. */
export function MicButton({ onTranscript, label = "Dictate", className }: Props) {
  const { listening, error, start, stop, supported } = useDictation({
    onFinal: (text) => onTranscript(text),
  });

  if (!supported) return null;

  return (
    <div className={className}>
      <button
        type="button"
        onClick={listening ? stop : start}
        aria-label={listening ? "Stop dictation" : label}
        aria-pressed={listening}
        className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs min-h-9 ${
          listening
            ? "border-destructive bg-destructive/10 text-destructive animate-pulse"
            : "border-input bg-background text-muted-foreground hover:text-foreground"
        }`}
      >
        {listening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
        <span>{listening ? "Listening…" : label}</span>
      </button>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
