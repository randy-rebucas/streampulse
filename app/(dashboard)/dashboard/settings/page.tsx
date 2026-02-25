"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Settings,
  Loader2,
  Check,
  Key,
  RefreshCw,
  Eye,
  EyeOff,
  ShieldCheck,
  Clock,
  Pin,
} from "lucide-react";

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [slowMode, setSlowMode] = useState(0);
  const [pinnedMessage, setPinnedMessage] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Admin
  const [isAdmin, setIsAdmin] = useState(false);
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [bannedWords, setBannedWords] = useState("");
  const [moderationThreshold, setModerationThreshold] = useState(0.5);
  const [regLoading, setRegLoading] = useState(false);
  const [adminSaved, setAdminSaved] = useState(false);

  // Stream key
  const [keyLoading, setKeyLoading] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);

  // Load profile data
  useEffect(() => {
    if (session?.user?.name) setName(session.user.name);
  }, [session?.user?.name]);

  useEffect(() => {
    if (!session) return;
    fetch("/api/user/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.user) {
          setBio(d.user.bio ?? "");
          setSlowMode(d.user.slowModeSeconds ?? 0);
          setPinnedMessage(d.user.pinnedMessage ?? "");
        }
      })
      .catch(() => {});

    fetch("/api/admin/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d !== null) {
          setIsAdmin(true);
          setRegistrationEnabled(d.registrationEnabled);
          setBannedWords((d.bannedWords ?? []).join("\n"));
          setModerationThreshold(d.moderationThreshold ?? 0.5);
        }
      })
      .catch(() => {});
  }, [session]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, bio, slowModeSeconds: slowMode, pinnedMessage }),
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

  const handleToggleRegistration = async () => {
    setRegLoading(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationEnabled: !registrationEnabled }),
      });
      if (res.ok) setRegistrationEnabled((v) => !v);
      else alert("Failed to update registration setting.");
    } finally {
      setRegLoading(false);
    }
  };

  const handleSaveAdminSettings = async () => {
    const words = bannedWords
      .split(/[\n,]+/)
      .map((w) => w.trim().toLowerCase())
      .filter(Boolean);
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bannedWords: words, moderationThreshold }),
    });
    if (res.ok) {
      setAdminSaved(true);
      setTimeout(() => setAdminSaved(false), 2000);
    } else {
      alert("Failed to save admin settings.");
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
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
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={300}
              rows={3}
              placeholder="Tell your viewers about yourself…"
              className="w-full resize-none rounded-lg border border-border bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="mt-1 text-right text-xs text-muted-foreground">{bio.length}/300</p>
          </div>

          {/* Slow mode */}
          <div>
            <label className="mb-1.5 flex items-center gap-2 text-sm font-medium">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              Chat Slow Mode
              <span className="ml-auto text-xs text-muted-foreground">
                {slowMode === 0 ? "Off" : `${slowMode}s`}
              </span>
            </label>
            <input
              type="range"
              min={0}
              max={120}
              step={5}
              value={slowMode}
              onChange={(e) => setSlowMode(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Off</span>
              <span>5s</span>
              <span>30s</span>
              <span>60s</span>
              <span>120s</span>
            </div>
          </div>

          {/* Pinned message */}
          <div>
            <label className="mb-1.5 flex items-center gap-2 text-sm font-medium">
              <Pin className="h-3.5 w-3.5 text-muted-foreground" />
              Pinned Chat Message
            </label>
            <input
              type="text"
              value={pinnedMessage}
              onChange={(e) => setPinnedMessage(e.target.value)}
              maxLength={300}
              placeholder="Leave blank to unpin"
              className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
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
      <div className="mb-6 rounded-xl border border-border bg-card p-6">
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
          {keyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Regenerate Stream Key
        </button>
      </div>

      {/* Admin — Site Settings */}
      {isAdmin && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            Site Settings
            <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              Admin
            </span>
          </h2>
          <p className="mb-5 text-sm text-muted-foreground">Global settings that affect all users.</p>

          {/* Registration toggle */}
          <div className="mb-5 flex items-center justify-between gap-4 rounded-lg border border-border bg-secondary px-4 py-3">
            <div>
              <p className="text-sm font-medium">Allow New Registrations</p>
              <p className="text-xs text-muted-foreground">
                When disabled, the sign-up page will reject new accounts.
              </p>
            </div>
            <button
              onClick={handleToggleRegistration}
              disabled={regLoading}
              aria-label={registrationEnabled ? "Disable registration" : "Enable registration"}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 ${
                registrationEnabled ? "bg-primary" : "bg-secondary-foreground/20"
              }`}
            >
              {regLoading ? (
                <Loader2 className="absolute left-1/2 -translate-x-1/2 h-3 w-3 animate-spin text-white" />
              ) : (
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                    registrationEnabled ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              )}
            </button>
          </div>

          {/* Banned words */}
          <div className="mb-5">
            <label className="mb-1.5 block text-sm font-medium">Banned Words</label>
            <p className="mb-2 text-xs text-muted-foreground">
              One word per line (or comma-separated). Messages containing these words will be blocked.
            </p>
            <textarea
              value={bannedWords}
              onChange={(e) => setBannedWords(e.target.value)}
              rows={5}
              placeholder={"badword\nanother word\n…"}
              className="w-full resize-none rounded-lg border border-border bg-secondary px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* AI moderation threshold */}
          <div className="mb-5">
            <label className="mb-1.5 flex items-center gap-2 text-sm font-medium">
              AI Moderation Sensitivity
              <span className="ml-auto text-xs text-muted-foreground">
                {(moderationThreshold * 100).toFixed(0)}%
              </span>
            </label>
            <p className="mb-2 text-xs text-muted-foreground">
              Lower = stricter. At 30%, messages scoring ≥0.30 on any harm category are blocked.
            </p>
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={moderationThreshold}
              onChange={(e) => setModerationThreshold(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Strict (10%)</span>
              <span>Default (50%)</span>
              <span>Lenient (100%)</span>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSaveAdminSettings}
              className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              {adminSaved && <Check className="h-4 w-4" />}
              {adminSaved ? "Saved!" : "Save Admin Settings"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
