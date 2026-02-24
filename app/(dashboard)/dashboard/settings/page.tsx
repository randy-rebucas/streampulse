"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Settings, Loader2, Check, Key, RefreshCw, Eye, EyeOff } from "lucide-react";

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Sync name once session loads (useState initial value misses async session)
  useEffect(() => {
    if (session?.user?.name) setName(session.user.name);
  }, [session?.user?.name]);

  const [keyLoading, setKeyLoading] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to save settings.");
      return;
    }

    await update({ name });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleRegenerateKey = async () => {
    if (!confirm("Regenerate your stream key? Your current key will stop working immediately.")) return;
    setKeyLoading(true);
    try {
      const res = await fetch("/api/user/stream-key", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setNewKey(data.streamKey);
        setShowKey(true);
      } else {
        alert("Failed to regenerate stream key.");
      }
    } finally {
      setKeyLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          Settings
        </h1>
        <p className="text-muted-foreground">Manage your profile and account</p>
      </div>

      {/* Profile */}
      <div className="mb-6 rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Profile</h2>

        {session?.user?.image && (
          <div className="mb-6 flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={session.user.image}
              alt={session.user.name ?? ""}
              className="h-16 w-16 rounded-full object-cover"
            />
            <div>
              <p className="font-medium">{session.user.name}</p>
              <p className="text-sm text-muted-foreground">{session.user.email}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSave} className="flex flex-col gap-4">
          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <div>
            <label className="mb-1.5 block text-sm font-medium">Display Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Email</label>
            <input
              type="email"
              value={session?.user?.email ?? ""}
              disabled
              className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm text-muted-foreground cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Email cannot be changed here.
            </p>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {saved && <Check className="h-4 w-4" />}
              {saved ? "Saved!" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>

      {/* Stream Key */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold">
          <Key className="h-4 w-4 text-muted-foreground" />
          Stream Key
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Your stream key authenticates your streaming software (OBS, etc.). Keep it secret.
        </p>

        {newKey ? (
          <div className="mb-4">
            <p className="mb-2 text-xs font-medium text-green-600">
              New key generated — copy it now, it won&apos;t be shown again.
            </p>
            <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-secondary px-3 py-2">
              <code className="flex-1 truncate font-mono text-xs text-primary">
                {showKey ? newKey : "•".repeat(Math.min(newKey.length, 40))}
              </code>
              <button
                onClick={() => setShowKey(!showKey)}
                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(newKey);
                  setKeyCopied(true);
                  setTimeout(() => setKeyCopied(false), 2000);
                }}
                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              >
                {keyCopied ? <Check className="h-4 w-4 text-green-500" /> : <Key className="h-4 w-4" />}
              </button>
            </div>
          </div>
        ) : (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2">
            <code className="flex-1 font-mono text-xs text-muted-foreground select-none">
              ••••••••••••••••••••••••••••••••
            </code>
            <span className="text-xs text-muted-foreground">Hidden for security</span>
          </div>
        )}

        <button
          onClick={handleRegenerateKey}
          disabled={keyLoading}
          className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50"
        >
          {keyLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Regenerate Stream Key
        </button>
      </div>
    </div>
  );
}

