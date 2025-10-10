import { c as createServerSupabaseClient } from "../../../../chunks/supabase.js";
import { json } from "@sveltejs/kit";
async function GET(event) {
  const supabase = createServerSupabaseClient(event);
  try {
    const {
      data: { session }
    } = await supabase.auth.getSession();
    if (!session) {
      return json({ error: "Unauthorized" }, { status: 401 });
    }
    const { data: runs, error } = await supabase.from("runs").select("*, workflow:workflows(name)").order("created_at", { ascending: false });
    if (error) throw error;
    return json({ runs: runs || [] });
  } catch (error) {
    console.error("Error fetching runs:", error);
    return json({ error: error.message }, { status: 500 });
  }
}
export {
  GET
};
