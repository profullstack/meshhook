import { h as head } from "../../../../chunks/index2.js";
import { W as WorkflowEditor } from "../../../../chunks/WorkflowEditor.js";
import { N as NodePalette } from "../../../../chunks/NodePalette.js";
import { U as escape_html } from "../../../../chunks/context.js";
function _page($$renderer, $$props) {
  let { data } = $$props;
  let nodes = [];
  let edges = [];
  let workflowName = "Untitled Workflow";
  function handleNodesChange(updatedNodes) {
    nodes = updatedNodes;
  }
  function handleEdgesChange(updatedEdges) {
    edges = updatedEdges;
  }
  let $$settled = true;
  let $$inner_renderer;
  function $$render_inner($$renderer2) {
    head($$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Workflows - MeshHook</title>`);
      });
    });
    $$renderer2.push(`<div class="workflows-page svelte-1grwlmo"><header class="page-header svelte-1grwlmo"><div class="header-content svelte-1grwlmo"><h1 class="svelte-1grwlmo">${escape_html(workflowName)}</h1> <div class="header-actions svelte-1grwlmo"><button class="btn-secondary svelte-1grwlmo">Rename</button> <button class="btn-primary svelte-1grwlmo">Save Workflow</button></div></div></header> <div class="workflow-container svelte-1grwlmo">`);
    NodePalette($$renderer2);
    $$renderer2.push(`<!----> <div class="editor-container svelte-1grwlmo">`);
    WorkflowEditor($$renderer2, {
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
    $$renderer2.push(`<!----></div></div></div>`);
  }
  do {
    $$settled = true;
    $$inner_renderer = $$renderer.copy();
    $$render_inner($$inner_renderer);
  } while (!$$settled);
  $$renderer.subsume($$inner_renderer);
}
export {
  _page as default
};
