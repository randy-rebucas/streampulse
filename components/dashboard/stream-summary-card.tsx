"use client";

import {
  Sparkles,
  MessageSquare,
  TrendingUp,
  ThumbsUp,
  AlertCircle,
  Minus,
  Download,
} from "lucide-react";

interface StreamSummaryCardProps {
  summary: {
    title: string;
    tldr: string;
    keyTopics: string[];
    highlights: Array<{
      timestamp: string;
      description: string;
      type: string;
    }>;
    sentiment: string;
  };
}

const sentimentConfig = {
  positive: {
    icon: ThumbsUp,
    color: "text-success",
    bg: "bg-success/10",
    label: "Positive",
  },
  neutral: {
    icon: Minus,
    color: "text-muted-foreground",
    bg: "bg-secondary",
    label: "Neutral",
  },
  negative: {
    icon: AlertCircle,
    color: "text-destructive",
    bg: "bg-destructive/10",
    label: "Negative",
  },
};

const highlightTypeColors: Record<string, string> = {
  funny: "bg-yellow-500/10 text-yellow-500",
  important: "bg-primary/10 text-primary",
  question: "bg-blue-500/10 text-blue-500",
  announcement: "bg-success/10 text-success",
};

export function StreamSummaryCard({ summary }: StreamSummaryCardProps) {
  const sentiment =
    sentimentConfig[summary.sentiment as keyof typeof sentimentConfig] ||
    sentimentConfig.neutral;
  const SentimentIcon = sentiment.icon;

  const handlePrint = () => {
    const el = document.getElementById("stream-summary-print");
    if (!el) return;
    const original = document.body.innerHTML;
    document.body.innerHTML = el.outerHTML;
    window.print();
    document.body.innerHTML = original;
    window.location.reload();
  };

  return (
    <div id="stream-summary-print" className="p-4 space-y-4 stream-summary-print">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold text-primary">AI Summary</h4>
        <div
          className={`flex items-center gap-1 rounded-full px-2 py-0.5 ${sentiment.bg}`}
        >
          <SentimentIcon className={`h-3 w-3 ${sentiment.color}`} />
          <span className={`text-[10px] font-medium ${sentiment.color}`}>
            {sentiment.label}
          </span>
        </div>
        <button
          onClick={handlePrint}
          className="no-print ml-auto flex items-center gap-1 rounded-lg bg-secondary px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          title="Export as PDF"
        >
          <Download className="h-3 w-3" />
          PDF
        </button>
      </div>

      {/* TLDR */}
      <div className="rounded-lg bg-secondary/50 p-3">
        <h5 className="text-sm font-semibold mb-1">{summary.title}</h5>
        <p className="text-sm text-muted-foreground">{summary.tldr}</p>
      </div>

      {/* Key Topics */}
      {summary.keyTopics.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" />
            Key Topics
          </p>
          <div className="flex flex-wrap gap-1.5">
            {summary.keyTopics.map((topic) => (
              <span
                key={topic}
                className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs text-primary"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Highlights */}
      {summary.highlights.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" />
            Highlights
          </p>
          <div className="space-y-2">
            {summary.highlights.map((highlight, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-lg bg-secondary/30 p-2.5"
              >
                <span className="shrink-0 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                  {highlight.timestamp}
                </span>
                <span className="text-xs text-foreground/80">
                  {highlight.description}
                </span>
                <span
                  className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10px] ${
                    highlightTypeColors[highlight.type] || "bg-secondary text-muted-foreground"
                  }`}
                >
                  {highlight.type}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
