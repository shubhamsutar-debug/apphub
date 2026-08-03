import { createBrowserClient } from "@supabase/ssr";
import type { UserProfile } from "@/types";

// ── Correct credentials for project lsluxdheynctqkewlvmu ─────────────────────
const CORRECT_URL = "https://lsluxdheynctqkewlvmu.supabase.co";
const CORRECT_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzbHV4ZGhleW5jdHFrZXdsdm11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MjExMDUsImV4cCI6MjA5MzI5NzEwNX0.Z-zXIbRE3NpNiEe9dfMt_xaNG2KYImi63E5QrWnGr0Q";

function cleanUrl(raw: string | undefined): string {
  if (!raw) return CORRECT_URL;
  // Fix doubled URLs like "https://x.cohttps://x.co"
  const match = raw.match(/https?:\/\/[a-zA-Z0-9\-]+\.supabase\.co/);
  return match ? match[0] : CORRECT_URL;
}

function getKey(raw: string | undefined): string {
  if (!raw) return CORRECT_KEY;
  const trimmed = raw.trim();
  // If key doesn't start with eyJ it's invalid — use fallback
  if (!trimmed.startsWith("eyJ")) return CORRECT_KEY;

  // Security check: Ensure the provided key is actually the anon key and not a user access token.
  // If a user accidentally pastes their access token in Vercel env vars, everyone will log in as them!
  try {
    const parts = trimmed.split(".");
    if (parts.length === 3) {
      // Decode base64url payload
      const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
      if (payload.role && payload.role !== "anon") {
        console.warn("Invalid anon key detected (role is not anon). Falling back to correct key.");
        return CORRECT_KEY;
      }
    }
  } catch {
    // Ignore decode errors
  }

  return trimmed;
}

const SUPABASE_URL = cleanUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
const SUPABASE_KEY = getKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);



// ── Singleton browser client ──────────────────────────────────────────────────
let _client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (!_client) {
    _client = createBrowserClient<any>(SUPABASE_URL, SUPABASE_KEY);
  }
  return _client;
}

// ── Cached user profile ───────────────────────────────────────────────────────
let _cachedProfile: UserProfile | null | undefined = undefined;

export async function getCachedProfile(): Promise<UserProfile | null> {
  if (_cachedProfile !== undefined) return _cachedProfile;

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    _cachedProfile = null;
    return null;
  }

  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single<UserProfile>();

  _cachedProfile = data ?? null;
  return _cachedProfile;
}

export function clearProfileCache() {
  _cachedProfile = undefined;
  _client = null;
}
