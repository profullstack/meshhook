import { c as createServerSupabaseClient } from "../../../../../chunks/supabase.js";
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
    const { data, error } = await supabase.from("workflows").select("*").eq("id", id).single();
    if (error) {
      if (error.code === "PGRST116") {
        return json({ error: "Workflow not found" }, { status: 404 });
      }
      throw error;
    }
    return json({ workflow: data });
  } catch (error) {
    console.error("Error fetching workflow:", error);
    return json({ error: error.message }, { status: 500 });
  }
}
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
    const { name, description, nodes, edges, status } = body;
    const updates = {
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (name !== void 0) updates.name = name;
    if (description !== void 0) updates.description = description;
    if (nodes !== void 0 || edges !== void 0) {
      updates.definition = { nodes, edges };
    }
    if (status !== void 0) updates.status = status;
    const { data, error } = await supabase.from("workflows").update(updates).eq("id", id).select().single();
    if (error) {
      if (error.code === "PGRST116") {
        return json({ error: "Workflow not found" }, { status: 404 });
      }
      throw error;
    }
    return json({ workflow: data });
  } catch (error) {
    console.error("Error updating workflow:", error);
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
    const { error } = await supabase.from("workflows").delete().eq("id", id);
    if (error) {
      if (error.code === "PGRST116") {
        return json({ error: "Workflow not found" }, { status: 404 });
      }
      throw error;
    }
    return json({ success: true });
  } catch (error) {
    console.error("Error deleting workflow:", error);
    return json({ error: error.message }, { status: 500 });
  }
}
export {
  DELETE,
  GET,
  PUT
};
