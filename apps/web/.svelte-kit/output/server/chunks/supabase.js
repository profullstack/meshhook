import { createBrowserClient, createServerClient } from "@supabase/ssr";
const PUBLIC_SUPABASE_URL = "https://rrendafjqwxirsqorrwd.supabase.co";
const PUBLIC_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJyZW5kYWZqcXd4aXJzcW9ycndkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwNzE5OTYsImV4cCI6MjA3NTY0Nzk5Nn0.qo5EwiN1W0fLqEpDlNijT3b2SR1BV_ptglzmDHETz9A";
function createClient() {
  return createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);
}
function createServerSupabaseClient(event) {
  return createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      get: (key) => event.cookies.get(key),
      set: (key, value, options) => {
        event.cookies.set(key, value, { ...options, path: "/" });
      },
      remove: (key, options) => {
        event.cookies.delete(key, { ...options, path: "/" });
      }
    }
  });
}
export {
  createClient as a,
  createServerSupabaseClient as c
};
