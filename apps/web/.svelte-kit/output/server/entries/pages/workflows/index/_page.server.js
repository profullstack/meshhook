import { c as createServerSupabaseClient } from "../../../../chunks/supabase.js";
async function load(event) {
  const supabase = createServerSupabaseClient(event);
  try {
    const {
      data: { session }
    } = await supabase.auth.getSession();
    if (!session) {
      return { workflows: [] };
    }
    const { data: workflows, error } = await supabase.from("workflows").select("*").order("updated_at", { ascending: false });
    if (error) {
      console.error("Error loading workflows:", error);
      return { workflows: [], error: error.message };
    }
    return { workflows: workflows || [] };
  } catch (error) {
    console.error("Error in workflows load:", error);
    return { workflows: [], error: error.message };
  }
}
export {
  load
};
