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
    const { data: secrets, error } = await supabase.from("secrets").select("*, project:projects(name)").order("created_at", { ascending: false });
    if (error) throw error;
    return json({ secrets: secrets || [] });
  } catch (error) {
    console.error("Error fetching secrets:", error);
    return json({ error: error.message }, { status: 500 });
  }
}
async function POST(event) {
  const supabase = createServerSupabaseClient(event);
  try {
    const {
      data: { session }
    } = await supabase.auth.getSession();
    if (!session) {
      return json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await event.request.json();
    const { name, value, project_id, description } = body;
    if (!name || !value) {
      return json({ error: "Name and value are required" }, { status: 400 });
    }
    const { data, error } = await supabase.from("secrets").insert({
      name,
      encrypted_value: value,
      // Will be encrypted by DB
      project_id,
      description
    }).select("*, project:projects(name)").single();
    if (error) throw error;
    return json({ secret: data }, { status: 201 });
  } catch (error) {
    console.error("Error creating secret:", error);
    return json({ error: error.message }, { status: 500 });
  }
}
export {
  GET,
  POST
};
