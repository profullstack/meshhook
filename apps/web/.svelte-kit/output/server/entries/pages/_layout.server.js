import { c as createServerSupabaseClient } from "../../chunks/supabase.js";
async function load(event) {
  const supabase = createServerSupabaseClient(event);
  const {
    data: { session },
    error
  } = await supabase.auth.getSession();
  if (error) {
    console.error("Error fetching session:", error);
  }
  return {
    session
  };
}
export {
  load
};
