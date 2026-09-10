import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://gbhazfqoqdopsnyyjmik.supabase.co";
// Fallback key untuk development, tapi sebaiknya dimasukkan ke .env sebagai VITE_SUPABASE_ANON_KEY
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "YOUR_SUPABASE_ANON_KEY_HERE";
const SUPABASE_TIMEOUT_MS = 10000;

const timedFetch = (input, init = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SUPABASE_TIMEOUT_MS);

  return fetch(input, { ...init, signal: controller.signal }).finally(() => {
    clearTimeout(timeout);
  });
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: timedFetch,
  },
});
