import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

// ── Correct credentials for project lsluxdheynctqkewlvmu ─────────────────────
const CORRECT_URL = "https://lsluxdheynctqkewlvmu.supabase.co";
const CORRECT_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzbHV4ZGhleW5jdHFrZXdsdm11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MjExMDUsImV4cCI6MjA5MzI5NzEwNX0.Z-zXIbRE3NpNiEe9dfMt_xaNG2KYImi63E5QrWnGr0Q";

function cleanUrl(raw: string | undefined): string {
  if (!raw) return CORRECT_URL;
  const match = raw.match(/https?:\/\/[a-zA-Z0-9\-]+\.supabase\.co/);
  return match ? match[0] : CORRECT_URL;
}

function getKey(raw: string | undefined): string {
  if (!raw) return CORRECT_KEY;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("eyJ")) return CORRECT_KEY;

  try {
    const parts = trimmed.split(".");
    if (parts.length === 3) {
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

export async function createClient() {
  const supabaseUrl = cleanUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseKey = getKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const cookieStore = await cookies();

  return createServerClient<any>(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from Server Component — middleware handles refresh
        }
      },
    },
  });
}
