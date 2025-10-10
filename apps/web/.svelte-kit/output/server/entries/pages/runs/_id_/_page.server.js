import { c as createServerSupabaseClient } from "../../../../chunks/supabase.js";
import { error } from "@sveltejs/kit";
async function load(event) {
  const supabase = createServerSupabaseClient(event);
  const { id } = event.params;
  try {
    const {
      data: { session }
    } = await supabase.auth.getSession();
    if (!session) {
      throw error(401, "Unauthorized");
    }
    const { data: run, error: runError } = await supabase.from("runs").select("*, workflow:workflows(*), events(*)").eq("id", id).single();
    if (runError) {
      if (runError.code === "PGRST116") {
        throw error(404, "Run not found");
      }
      throw runError;
    }
    return { run };
  } catch (err) {
    console.error("Error loading run:", err);
    throw error(err.status || 500, err.message || "Failed to load run");
  }
}
export {
  load
};
