import { h as head, b as attr_style, s as stringify } from "../../../../chunks/index2.js";
import { W as WorkflowEditor } from "../../../../chunks/WorkflowEditor.js";
import "@sveltejs/kit/internal";
import "../../../../chunks/exports.js";
import "../../../../chunks/utils2.js";
import { U as escape_html } from "../../../../chunks/context.js";
import "@sveltejs/kit/internal/server";
import "../../../../chunks/state.svelte.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    const run = data.run;
    const nodes = run?.workflow?.definition?.nodes || [];
    const edges = run?.workflow?.definition?.edges || [];
    const enhancedNodes = nodes.map((node) => {
      const nodeEvent = run?.events?.find((e) => e.node_id === node.id);
      return {
        ...node,
        data: {
          ...node.data,
          status: nodeEvent?.status || "pending",
          executionTime: nodeEvent?.execution_time
        }
      };
    });
    const statusColors = {
      pending: "#fbbf24",
      running: "#3b82f6",
      completed: "#10b981",
      failed: "#ef4444",
      cancelled: "#6b7280"
    };
    function formatDate(dateString) {
      if (!dateString) return "N/A";
      return new Date(dateString).toLocaleString();
    }
    function formatDuration(ms) {
      if (!ms) return "N/A";
      const seconds = Math.floor(ms / 1e3);
      if (seconds < 60) return `${seconds}s`;
      return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    }
    head($$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Run ${escape_html(run?.id?.slice(0, 8))} - MeshHook</title>`);
      });
    });
    $$renderer2.push(`<div class="run-detail-page svelte-1eidjaf"><header class="page-header svelte-1eidjaf"><div class="header-content svelte-1eidjaf"><button class="btn-back svelte-1eidjaf">← Back to Runs</button> <div class="run-info svelte-1eidjaf"><h1 class="svelte-1eidjaf">Run #${escape_html(run?.id?.slice(0, 8))}</h1> <span class="status-badge svelte-1eidjaf"${attr_style(`background-color: ${stringify(statusColors[run?.status] || "#6b7280")}`)}>${escape_html(run?.status)}</span></div></div></header> <div class="run-content svelte-1eidjaf"><div class="run-sidebar svelte-1eidjaf"><div class="info-panel svelte-1eidjaf"><h3 class="svelte-1eidjaf">Run Information</h3> <div class="info-item svelte-1eidjaf"><span class="info-label svelte-1eidjaf">Workflow:</span> <span class="info-value svelte-1eidjaf">${escape_html(run?.workflow?.name || "Unknown")}</span></div> <div class="info-item svelte-1eidjaf"><span class="info-label svelte-1eidjaf">Status:</span> <span class="info-value svelte-1eidjaf">${escape_html(run?.status)}</span></div> <div class="info-item svelte-1eidjaf"><span class="info-label svelte-1eidjaf">Started:</span> <span class="info-value svelte-1eidjaf">${escape_html(formatDate(run?.started_at))}</span></div> `);
    if (run?.completed_at) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="info-item svelte-1eidjaf"><span class="info-label svelte-1eidjaf">Completed:</span> <span class="info-value svelte-1eidjaf">${escape_html(formatDate(run?.completed_at))}</span></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <div class="info-item svelte-1eidjaf"><span class="info-label svelte-1eidjaf">Duration:</span> <span class="info-value svelte-1eidjaf">${escape_html(formatDuration(run?.completed_at ? new Date(run.completed_at) - new Date(run.started_at) : Date.now() - new Date(run?.started_at || Date.now())))}</span></div> `);
    if (run?.error) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="info-item error svelte-1eidjaf"><span class="info-label svelte-1eidjaf">Error:</span> <span class="info-value svelte-1eidjaf">${escape_html(run.error)}</span></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div></div> <div class="run-main svelte-1eidjaf"><div class="dag-container svelte-1eidjaf"><h3 class="svelte-1eidjaf">Execution Flow</h3> <div class="dag-viewer svelte-1eidjaf">`);
    WorkflowEditor($$renderer2, { nodes: enhancedNodes, edges });
    $$renderer2.push(`<!----></div></div></div></div></div>`);
  });
}
export {
  _page as default
};
