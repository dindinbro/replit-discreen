// Supabase auth is disabled in Discreen V2.
// Authentication is now handled via username/password + server sessions.
import type { SupabaseClient } from "@supabase/supabase-js";
export const supabase: SupabaseClient | null = null;
