import { c as createServerSupabaseClient } from "../../../../../../chunks/supabase.js";
import { json } from "@sveltejs/kit";
async function GET(event) {
  const supabase = createServerSupabaseClient(event);
  const { id } = event.params;
  try {
    const {
      data: { session }
    } = await supabase.auth.getSession();
    if (!session) {
      return json({ error: "Unauthorized" }, { status: 401 });
    }
    const { data: versions, error } = await supabase.from("workflow_versions").select("*").eq("workflow_id", id).order("version", { ascending: false });
    if (error) throw error;
    return json({ versions: versions || [] });
  } catch (error) {
    console.error("Error fetching versions:", error);
    return json({ error: error.message }, { status: 500 });
  }
}
async function POST(event) {
  const supabase = createServerSupabaseClient(event);
  const { id } = event.params;
  try {
    const {
      data: { session }
    } = await supabase.auth.getSession();
    if (!session) {
      return json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await event.request.json();
    const { version_id, description } = body;
    const { data: sourceVersion, error: fetchError } = await supabase.from("workflow_versions").select("*").eq("id", version_id).single();
    if (fetchError) throw fetchError;
    const { data: maxVersionData } = await supabase.from("workflow_versions").select("version").eq("workflow_id", id).order("version", { ascending: false }).limit(1).single();
    const newVersion = (maxVersionData?.version || 0) + 1;
    const { data: newVersionData, error: createError } = await supabase.from("workflow_versions").insert({
      workflow_id: id,
      version: newVersion,
      definition: sourceVersion.definition,
      description: description || `Rolled back to v${sourceVersion.version}`,
      status: "draft",
      is_current: true
    }).select().single();
    if (createError) throw createError;
    const { error: updateError } = await supabase.from("workflows").update({
      definition: sourceVersion.definition,
      version: newVersion,
      status: "draft",
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    }).eq("id", id);
    if (updateError) throw updateError;
    return json({ version: newVersionData }, { status: 201 });
  } catch (error) {
    console.error("Error creating version:", error);
    return json({ error: error.message }, { status: 500 });
  }
}
export {
  GET,
  POST
};
