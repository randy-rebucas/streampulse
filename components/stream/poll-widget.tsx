"use client";

import { useState } from "react";
import { BarChart3, Check, Loader2, X } from "lucide-react";
import { useChatStore } from "@/stores/chat-store";

interface PollWidgetProps {
  streamId: string;
  isStreamer: boolean;
  /** Optional: stream owner will see a create panel */
}

export function PollWidget({ streamId, isStreamer }: PollWidgetProps) {
  const { activePoll, setActivePoll, updatePollVotes } = useChatStore();

  // ── Streamer: create poll form ──────────────────────────────────────────
  const [creating, setCreating] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [duration, setDuration] = useState("60");
  const [saving, setSaving] = useState(false);

  const addOption = () => setOptions((o) => [...o, ""].slice(0, 6));
  const removeOption = (i: number) => setOptions((o) => o.filter((_, idx) => idx !== i));
  const setOption = (i: number, v: string) => setOptions((o) => o.map((x, idx) => (idx === i ? v : x)));

  const handleCreate = async () => {
    const valid = options.filter((o) => o.trim());
    if (!question.trim() || valid.length < 2) return;
    setSaving(true);
    const res = await fetch("/api/polls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        streamId,
        question: question.trim(),
        options: valid,
        durationSeconds: Number(duration) || undefined,
      }),
    });
    setSaving(false);
    if (res.ok) {
      const { poll } = await res.json();
      setActivePoll(poll);
      setCreating(false);
      setQuestion("");
      setOptions(["", ""]);
    }
  };

  const handleEnd = async () => {
    await fetch(`/api/polls?streamId=${streamId}`, { method: "DELETE" });
    setActivePoll(null);
  };

  // ── Viewer: vote ────────────────────────────────────────────────────────
  const [voting, setVoting] = useState(false);

  const handleVote = async (optionIndex: number) => {
    if (!activePoll || activePoll.myVote !== undefined || voting) return;
    setVoting(true);
    const res = await fetch(`/api/polls/${activePoll.id}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ optionIndex }),
    });
    setVoting(false);
    if (res.ok) {
      const { options: opts, totalVotes } = await res.json();
      updatePollVotes(opts, totalVotes, optionIndex);
    }
  };

  // ── Streamer: create form ───────────────────────────────────────────────
  if (isStreamer && creating) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Create Poll
          </p>
          <button onClick={() => setCreating(false)} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Poll question..."
          className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />

        <div className="space-y-2">
          {options.map((opt, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={opt}
                onChange={(e) => setOption(i, e.target.value)}
                placeholder={`Option ${i + 1}`}
                className="flex-1 rounded-lg border border-border bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {options.length > 2 && (
                <button onClick={() => removeOption(i)} className="text-muted-foreground hover:text-destructive">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
          {options.length < 6 && (
            <button onClick={addOption} className="text-xs text-primary hover:underline">
              + Add option
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Duration:</label>
          <select
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="rounded-lg border border-border bg-secondary px-2 py-1 text-xs"
          >
            <option value="">No limit</option>
            <option value="30">30 s</option>
            <option value="60">1 min</option>
            <option value="120">2 min</option>
            <option value="300">5 min</option>
          </select>
        </div>

        <button
          onClick={handleCreate}
          disabled={saving || !question.trim() || options.filter((o) => o.trim()).length < 2}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
          Start Poll
        </button>
      </div>
    );
  }

  // ── Active poll ─────────────────────────────────────────────────────────
  if (activePoll) {
    const hasVoted = activePoll.myVote !== undefined;
    const total = activePoll.totalVotes || 1;

    return (
      <div className="rounded-xl border border-primary/30 bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Live Poll
          </p>
          {isStreamer && (
            <button onClick={handleEnd} className="text-xs text-muted-foreground hover:text-destructive">
              End poll
            </button>
          )}
        </div>

        <p className="text-sm font-medium">{activePoll.question}</p>

        <div className="space-y-2">
          {activePoll.options.map((opt, i) => {
            const pct = hasVoted ? Math.round((opt.votes / total) * 100) : 0;
            const isMyVote = activePoll.myVote === i;
            return (
              <button
                key={i}
                onClick={() => handleVote(i)}
                disabled={hasVoted || voting}
                className={`relative w-full overflow-hidden rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                  isMyVote ? "border-primary" : "border-border"
                } ${!hasVoted ? "hover:bg-secondary" : "cursor-default"}`}
              >
                {hasVoted && (
                  <span
                    className="absolute inset-y-0 left-0 bg-primary/10 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                )}
                <span className="relative flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    {isMyVote && <Check className="h-3 w-3 text-primary shrink-0" />}
                    {opt.text}
                  </span>
                  {hasVoted && (
                    <span className="text-xs text-muted-foreground">{pct}%</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">{activePoll.totalVotes} vote{activePoll.totalVotes !== 1 ? "s" : ""}</p>
      </div>
    );
  }

  // ── No active poll + streamer ───────────────────────────────────────────
  if (isStreamer) {
    return (
      <button
        onClick={() => setCreating(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-2.5 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
      >
        <BarChart3 className="h-4 w-4" />
        Start a Poll
      </button>
    );
  }

  return null;
}
