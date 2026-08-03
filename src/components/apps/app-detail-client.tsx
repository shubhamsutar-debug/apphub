"use client";

import { useState, useActionState } from "react";
import { Download, Heart, Flag, Loader2, Share2, Check, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StarRating } from "@/components/apps/star-rating";
import { toggleFavoriteAction, submitReviewAction, recordDownloadAction } from "@/lib/actions/apps";
import type { Application, ApplicationVersion, AuthUser, Review } from "@/types";

interface AppDetailClientProps {
  app: Application;
  latestVersion: ApplicationVersion | undefined;
  user: AuthUser | null;
  isFavorited: boolean;
  userReview: Review | null;
}

// ── Share Button ──────────────────────────────────────────────────────────────
function ShareButton({ appName, slug }: { appName: string; slug: string }) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
    const shareUrl = `${appUrl}/apps/${slug}`;
    const shareData = {
      title: `${appName} — AppHub`,
      text: `Check out ${appName} on AppHub!`,
      url: shareUrl,
    };

    // Use native share sheet if available (mobile)
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // User cancelled — fall through to copy
      }
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Last fallback: select text
      const el = document.createElement("input");
      el.value = shareUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <Button variant="secondary" size="lg" onClick={handleShare} className="gap-2">
      {copied ? (
        <><Check className="h-4 w-4 text-primary" /> Link Copied!</>
      ) : (
        <><Share2 className="h-4 w-4" /> Share</>
      )}
    </Button>
  );
}

// ── Shareable Link Display ────────────────────────────────────────────────────
function ShareableLinkBar({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  const appUrl = typeof window !== "undefined"
    ? window.location.origin
    : process.env.NEXT_PUBLIC_APP_URL ?? "";
  const shareUrl = `${appUrl}/apps/${slug}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-2 rounded-xl border border-primary/15 bg-primary/5 px-3 py-2">
      <LinkIcon className="h-4 w-4 shrink-0 text-primary" />
      <span className="min-w-0 flex-1 truncate text-xs text-secondary-300 overflow-hidden">{shareUrl}</span>
      <button
        type="button"
        onClick={handleCopy}
        className="ml-1 shrink-0 rounded-lg bg-primary/15 px-2.5 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/25"
      >
        {copied ? "✓" : "Copy"}
      </button>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function AppDetailClient({
  app,
  latestVersion,
  user,
  isFavorited: initialFavorited,
  userReview,
}: AppDetailClientProps) {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [downloading, setDownloading] = useState(false);
  const [reviewRating, setReviewRating] = useState(userReview?.rating ?? 0);
  const [reviewState, reviewAction, reviewPending] = useActionState(submitReviewAction, {});

  const handleDownload = async () => {
    if (!latestVersion) return;
    setDownloading(true);
    await recordDownloadAction(app.id, latestVersion.id);
    window.open(latestVersion.apk_path, "_blank");
    setDownloading(false);
  };

  const handleFavorite = async () => {
    setFavorited(!favorited);
    await toggleFavoriteAction(app.id);
  };

  return (
    <div className="space-y-5">
      {/* ── Action Buttons ──────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        {/* Primary: Download full width on mobile */}
        <Button
          onClick={handleDownload}
          disabled={!latestVersion || downloading}
          size="lg"
          className="w-full gap-2"
        >
          {downloading
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Downloading...</>
            : <><Download className="h-4 w-4" /> Download APK</>}
        </Button>

        {/* Secondary row: Save + Share + Report */}
        <div className="grid grid-cols-3 gap-2">
          {user ? (
            <Button
              variant={favorited ? "primary" : "secondary"}
              onClick={handleFavorite}
              className="gap-1.5 text-sm"
            >
              <Heart className={`h-4 w-4 ${favorited ? "fill-current" : ""}`} />
              <span className="hidden sm:inline">{favorited ? "Saved" : "Save"}</span>
              <span className="sm:hidden">{favorited ? "Saved" : "Save"}</span>
            </Button>
          ) : (
            <a href="/login" className="btn-secondary flex items-center justify-center gap-1.5 text-sm">
              <Heart className="h-4 w-4" />
              <span>Save</span>
            </a>
          )}
          <ShareButton appName={app.name} slug={app.slug} />
          <Button variant="ghost" className="gap-1.5 text-sm text-red-400 hover:text-red-300">
            <Flag className="h-4 w-4" />
            <span>Report</span>
          </Button>
        </div>
      </div>

      {/* ── Shareable link bar ──────────────────────────────────── */}
      <ShareableLinkBar slug={app.slug} />

      {!latestVersion && (
        <p className="text-sm text-yellow-400/80">
          No APK available for download yet.
        </p>
      )}

      {/* ── Write Review ────────────────────────────────────────── */}
      {user && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h3 className="mb-4 font-semibold">
            {userReview ? "Update Your Review" : "Write a Review"}
          </h3>

          {reviewState.success && (
            <div className="mb-4 rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">
              {reviewState.success}
            </div>
          )}
          {reviewState.error && (
            <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {reviewState.error}
            </div>
          )}

          <form action={reviewAction} className="space-y-4">
            <input type="hidden" name="application_id" value={app.id} />
            <input type="hidden" name="rating" value={reviewRating} />

            <div>
              <label className="mb-2 block text-sm font-medium">Your Rating</label>
              <StarRating value={reviewRating} onChange={setReviewRating} size="lg" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Title (optional)</label>
              <Input name="title" placeholder="Summarize your experience" defaultValue={userReview?.title ?? ""} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Review (optional)</label>
              <Textarea name="body" placeholder="Share your detailed experience..." rows={4} defaultValue={userReview?.body ?? ""} />
            </div>
            <Button type="submit" disabled={reviewPending || reviewRating === 0}>
              {reviewPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {userReview ? "Update Review" : "Submit Review"}
            </Button>
          </form>
        </div>
      )}

      {!user && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center">
          <p className="text-sm text-secondary-400">
            <a href="/login" className="text-primary hover:underline">Sign in</a>{" "}
            to rate and review this app
          </p>
        </div>
      )}
    </div>
  );
}
