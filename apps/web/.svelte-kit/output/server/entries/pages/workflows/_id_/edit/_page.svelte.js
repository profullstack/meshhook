import { f as attr_class, c as ensure_array_like, d as bind_props, h as head, a as attr } from "../../../../../chunks/index2.js";
import { W as WorkflowEditor } from "../../../../../chunks/WorkflowEditor.js";
import { N as NodePalette } from "../../../../../chunks/NodePalette.js";
import { U as escape_html } from "../../../../../chunks/context.js";
import "@sveltejs/kit/internal";
import "../../../../../chunks/exports.js";
import "../../../../../chunks/utils2.js";
import "@sveltejs/kit/internal/server";
import "../../../../../chunks/state.svelte.js";
function ValidationPanel($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { errors = [], isOpen = true } = $$props;
    const hasErrors = errors.length > 0;
    if (hasErrors) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div${attr_class("validation-panel svelte-1fs7n2f", void 0, { "collapsed": !isOpen })}><button class="panel-header svelte-1fs7n2f"><div class="header-content svelte-1fs7n2f"><span class="icon svelte-1fs7n2f">⚠️</span> <span class="title svelte-1fs7n2f">Validation Issues (${escape_html(errors.length)})</span></div> <span class="toggle-icon svelte-1fs7n2f">${escape_html(isOpen ? "▼" : "▶")}</span></button> `);
      if (isOpen) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<div class="panel-body svelte-1fs7n2f"><ul class="error-list svelte-1fs7n2f"><!--[-->`);
        const each_array = ensure_array_like(errors);
        for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
          let error = each_array[$$index];
          $$renderer2.push(`<li class="error-item svelte-1fs7n2f"><span class="error-icon svelte-1fs7n2f">•</span> <span class="error-text svelte-1fs7n2f">${escape_html(error)}</span></li>`);
        }
        $$renderer2.push(`<!--]--></ul></div>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]-->`);
    bind_props($$props, { isOpen });
  });
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    let nodes = data.workflow?.definition?.nodes || [];
    let edges = data.workflow?.definition?.edges || [];
    let workflowName = data.workflow?.name || "Untitled Workflow";
    data.workflow?.description || "";
    let workflowStatus = data.workflow?.status || "draft";
    let saving = false;
    let validationErrors = [];
    function handleNodesChange(updatedNodes) {
      nodes = updatedNodes;
    }
    function handleEdgesChange(updatedEdges) {
      edges = updatedEdges;
    }
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      head($$renderer3, ($$renderer4) => {
        $$renderer4.title(($$renderer5) => {
          $$renderer5.push(`<title>Edit ${escape_html(workflowName)} - MeshHook</title>`);
        });
      });
      $$renderer3.push(`<div class="workflows-page svelte-33tnje"><header class="page-header svelte-33tnje"><div class="header-content svelte-33tnje"><div class="header-left svelte-33tnje"><button class="btn-back svelte-33tnje">← Back</button> <div class="workflow-info svelte-33tnje"><input type="text"${attr("value", workflowName)} class="workflow-name-input svelte-33tnje" placeholder="Workflow name"/> <span${attr_class("status-badge svelte-33tnje", void 0, { "published": workflowStatus === "published" })}>${escape_html(workflowStatus)}</span></div></div> <div class="header-actions svelte-33tnje"><button class="btn-secondary svelte-33tnje"${attr("disabled", saving, true)}>${escape_html("Save Draft")}</button> `);
      if (workflowStatus === "draft") {
        $$renderer3.push("<!--[-->");
        $$renderer3.push(`<button class="btn-primary svelte-33tnje"${attr("disabled", validationErrors.length > 0, true)}>Publish</button>`);
      } else {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]--></div></div></header> <div class="workflow-container svelte-33tnje">`);
      NodePalette($$renderer3);
      $$renderer3.push(`<!----> <div class="editor-container svelte-33tnje">`);
      WorkflowEditor($$renderer3, {
        onNodesChange: handleNodesChange,
        onEdgesChange: handleEdgesChange,
        get nodes() {
          return nodes;
        },
        set nodes($$value) {
          nodes = $$value;
          $$settled = false;
        },
        get edges() {
          return edges;
        },
        set edges($$value) {
          edges = $$value;
          $$settled = false;
        }
      });
      $$renderer3.push(`<!----></div></div> `);
      ValidationPanel($$renderer3, { errors: validationErrors });
      $$renderer3.push(`<!----></div>`);
    }
    do {
      $$settled = true;
      $$inner_renderer = $$renderer2.copy();
      $$render_inner($$inner_renderer);
    } while (!$$settled);
    $$renderer2.subsume($$inner_renderer);
  });
}
export {
  _page as default
};
