import { c as createServerSupabaseClient } from "../../../../../chunks/supabase.js";
import { json } from "@sveltejs/kit";
async function PUT(event) {
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
    const { value, description } = body;
    const updates = {
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (value !== void 0) updates.encrypted_value = value;
    if (description !== void 0) updates.description = description;
    const { data, error } = await supabase.from("secrets").update(updates).eq("id", id).select("*, project:projects(name)").single();
    if (error) throw error;
    return json({ secret: data });
  } catch (error) {
    console.error("Error updating secret:", error);
    return json({ error: error.message }, { status: 500 });
  }
}
async function DELETE(event) {
  const supabase = createServerSupabaseClient(event);
  const { id } = event.params;
  try {
    const {
      data: { session }
    } = await supabase.auth.getSession();
    if (!session) {
      return json({ error: "Unauthorized" }, { status: 401 });
    }
    const { error } = await supabase.from("secrets").delete().eq("id", id);
    if (error) throw error;
    return json({ success: true });
  } catch (error) {
    console.error("Error deleting secret:", error);
    return json({ error: error.message }, { status: 500 });
  }
}
export {
  DELETE,
  PUT
};
