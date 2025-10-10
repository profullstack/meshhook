import { c as createServerSupabaseClient } from "../../../chunks/supabase.js";
async function load(event) {
  const supabase = createServerSupabaseClient(event);
  try {
    const {
      data: { session }
    } = await supabase.auth.getSession();
    if (!session) {
      return { secrets: [], projects: [] };
    }
    const { data: secrets, error: secretsError } = await supabase.from("secrets").select("*, project:projects(name)").order("created_at", { ascending: false });
    if (secretsError) {
      console.error("Error loading secrets:", secretsError);
    }
    const { data: projects, error: projectsError } = await supabase.from("projects").select("id, name").order("name");
    if (projectsError) {
      console.error("Error loading projects:", projectsError);
    }
    return {
      secrets: secrets || [],
      projects: projects || []
    };
  } catch (error) {
    console.error("Error in secrets load:", error);
    return { secrets: [], projects: [], error: error.message };
  }
}
export {
  load
};
