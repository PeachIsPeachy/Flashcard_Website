import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";

const TOPICS = [
  { value: "", label: "Select a topic..." },
  { value: "bug", label: "Bug report" },
  { value: "feature", label: "Feature request" },
  { value: "study", label: "Study experience" },
  { value: "other", label: "Other" },
] as const;

const SENTIMENTS = [
  { id: 1 as const, emoji: "😭", label: "Very dissatisfied" },
  { id: 2 as const, emoji: "😞", label: "Dissatisfied" },
  { id: 3 as const, emoji: "🙂", label: "Neutral" },
  { id: 4 as const, emoji: "🤩", label: "Very satisfied" },
] as const;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail?: string | null;
};

export function FeedbackDialog({ open, onOpenChange, userEmail }: Props) {
  const [topic, setTopic] = useState("");
  const [message, setMessage] = useState("");
  const [sentiment, setSentiment] = useState<(typeof SENTIMENTS)[number]["id"]>(
    3
  );

  function reset() {
    setTopic("");
    setMessage("");
    setSentiment(3);
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  function handleSend() {
    const t = TOPICS.find((x) => x.value === topic)?.label ?? topic;
    if (!topic.trim()) {
      toast.error("Choose a topic");
      return;
    }
    if (!message.trim()) {
      toast.error("Enter your feedback");
      return;
    }
    // Hook up to your API / Supabase table when ready
    console.info("[feedback]", {
      topic: t,
      message: message.trim(),
      sentiment,
      email: userEmail ?? undefined,
    });
    toast.success("Thanks — your feedback was sent.");
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          "max-w-md gap-0 overflow-hidden border-zinc-700/80 bg-zinc-950 p-0 text-zinc-100 shadow-2xl sm:rounded-xl",
          "[&>button]:text-zinc-400 [&>button]:hover:text-zinc-100"
        )}
      >
        <DialogTitle className="sr-only">Send feedback</DialogTitle>
        <div className="max-h-[85vh] overflow-y-auto p-5 sm:p-6">
          <div className="space-y-4">
            <div className="relative">
              <select
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className={cn(
                  "h-11 w-full appearance-none rounded-lg border border-zinc-600/80 bg-zinc-900/90 pl-3 pr-10 text-sm text-zinc-100",
                  "outline-none focus-visible:ring-2 focus-visible:ring-zinc-500",
                  !topic && "text-zinc-500"
                )}
                aria-label="Feedback topic"
              >
                {TOPICS.map((opt) => (
                  <option
                    key={opt.value || "placeholder"}
                    value={opt.value}
                    disabled={opt.value === ""}
                    className="bg-zinc-900"
                  >
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            </div>

            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Your feedback..."
              className="min-h-[140px] resize-y rounded-lg border-zinc-600/80 bg-zinc-900/90 text-zinc-100 placeholder:text-zinc-500"
              aria-label="Your feedback"
            />

            <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
              <div
                className="flex items-center gap-1 sm:gap-2"
                role="group"
                aria-label="Satisfaction"
              >
                {SENTIMENTS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSentiment(s.id)}
                    title={s.label}
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-full text-2xl leading-none transition-colors",
                      "hover:bg-white/5",
                      sentiment === s.id &&
                        "bg-white/10 ring-2 ring-white/25 ring-offset-2 ring-offset-zinc-950"
                    )}
                    aria-pressed={sentiment === s.id}
                    aria-label={s.label}
                  >
                    <span aria-hidden>{s.emoji}</span>
                  </button>
                ))}
              </div>

              <Button
                type="button"
                onClick={handleSend}
                className="min-h-10 shrink-0 rounded-lg bg-white px-6 font-medium text-zinc-950 hover:bg-zinc-100"
              >
                Send
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
