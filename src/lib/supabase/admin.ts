import { createClient } from "@supabase/supabase-js";

// ── Correct credentials for project lsluxdheynctqkewlvmu ─────────────────────
const CORRECT_URL = "https://lsluxdheynctqkewlvmu.supabase.co";
const CORRECT_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzbHV4ZGhleW5jdHFrZXdsdm11Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzcyMTEwNSwiZXhwIjoyMDkzMjk3MTA1fQ.1VGX9LCq3fAmXVzvQCVCi7YVoyXRH_X9vjXaxymWyOs";

function cleanUrl(raw: string | undefined): string {
  if (!raw) return CORRECT_URL;
  const match = raw.match(/https?:\/\/[a-zA-Z0-9\-]+\.supabase\.co/);
  return match ? match[0] : CORRECT_URL;
}

function getKey(raw: string | undefined): string {
  if (!raw) return CORRECT_SERVICE_KEY;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("eyJ")) return CORRECT_SERVICE_KEY;

  try {
    const parts = trimmed.split(".");
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
      if (payload.role && payload.role !== "service_role") {
        console.warn("Invalid service role key detected. Falling back to correct key.");
        return CORRECT_SERVICE_KEY;
      }
    }
  } catch {
    // Ignore decode errors
  }

  return trimmed;
}

export function createAdminClient() {
  const url = cleanUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceRoleKey = getKey(process.env.SUPABASE_SERVICE_ROLE_KEY);

  return createClient<any>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
