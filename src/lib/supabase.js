import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://gbhazfqoqdopsnyyjmik.supabase.co";
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdiaGF6ZnFvcWRvcHNueXlqbWlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwNTkzNDUsImV4cCI6MjEwMzYzNTM0NX0.uvV9Fh3b3fLvjdJvhv0QP_RmKsExxI8wYrd2OI-0XPk";
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
