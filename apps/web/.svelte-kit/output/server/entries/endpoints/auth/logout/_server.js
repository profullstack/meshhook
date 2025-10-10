import { c as createServerSupabaseClient } from "../../../../chunks/supabase.js";
import { redirect } from "@sveltejs/kit";
async function POST(event) {
  const supabase = createServerSupabaseClient(event);
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("Error signing out:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
  throw redirect(303, "/auth/login");
}
export {
  POST
};
