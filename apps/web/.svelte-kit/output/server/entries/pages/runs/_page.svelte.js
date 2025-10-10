import { b as attr_style, s as stringify, h as head, c as ensure_array_like } from "../../../chunks/index2.js";
import { U as escape_html } from "../../../chunks/context.js";
import "@sveltejs/kit/internal";
import "../../../chunks/exports.js";
import "../../../chunks/utils2.js";
import "@sveltejs/kit/internal/server";
import "../../../chunks/state.svelte.js";
function RunCard($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { run } = $$props;
    const statusColors = {
      pending: "#fbbf24",
      running: "#3b82f6",
      completed: "#10b981",
      failed: "#ef4444",
      cancelled: "#6b7280"
    };
    const statusColor = statusColors[run.status] || "#6b7280";
    function formatDate(dateString) {
      if (!dateString) return "N/A";
      return new Date(dateString).toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    }
    function formatDuration(startedAt, completedAt) {
      if (!startedAt) return "N/A";
      const start = new Date(startedAt);
      const end = completedAt ? new Date(completedAt) : /* @__PURE__ */ new Date();
      const duration2 = Math.floor((end - start) / 1e3);
      if (duration2 < 60) return `${duration2}s`;
      if (duration2 < 3600) return `${Math.floor(duration2 / 60)}m ${duration2 % 60}s`;
      return `${Math.floor(duration2 / 3600)}h ${Math.floor(duration2 % 3600 / 60)}m`;
    }
    const duration = formatDuration(run.started_at, run.completed_at);
    $$renderer2.push(`<div class="run-card svelte-7ka0tr"><div class="card-header svelte-7ka0tr"><div class="run-info svelte-7ka0tr"><h4 class="run-id svelte-7ka0tr">Run #${escape_html(run.id.slice(0, 8))}</h4> <span class="status-badge svelte-7ka0tr"${attr_style(`background-color: ${stringify(statusColor)}`)}>${escape_html(run.status)}</span></div> <span class="run-date svelte-7ka0tr">${escape_html(formatDate(run.created_at))}</span></div> <div class="card-body svelte-7ka0tr"><div class="run-meta svelte-7ka0tr"><div class="meta-item svelte-7ka0tr"><span class="meta-label svelte-7ka0tr">Workflow:</span> <span class="meta-value svelte-7ka0tr">${escape_html(run.workflow?.name || "Unknown")}</span></div> <div class="meta-item svelte-7ka0tr"><span class="meta-label svelte-7ka0tr">Duration:</span> <span class="meta-value svelte-7ka0tr">${escape_html(duration)}</span></div> `);
    if (run.error) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="meta-item error svelte-7ka0tr"><span class="meta-label svelte-7ka0tr">Error:</span> <span class="meta-value svelte-7ka0tr">${escape_html(run.error)}</span></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div></div> <div class="card-actions svelte-7ka0tr"><button class="btn-action svelte-7ka0tr">View Details</button> `);
    if (run.status === "failed") {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<button class="btn-action svelte-7ka0tr">Retry</button>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (run.status === "running" || run.status === "pending") {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<button class="btn-action btn-danger svelte-7ka0tr">Cancel</button>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div></div>`);
  });
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    let runs = data.runs || [];
    let filterStatus = "all";
    let filterWorkflow = "all";
    const filteredRuns = () => {
      let result = runs;
      return result;
    };
    const filtered = filteredRuns();
    const workflows = Array.from(new Set(runs.map((r) => r.workflow_id))).map((id) => {
      const run = runs.find((r) => r.workflow_id === id);
      return { id, name: run?.workflow?.name || "Unknown" };
    });
    head($$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Runs - MeshHook</title>`);
      });
    });
    $$renderer2.push(`<div class="runs-page svelte-1btsuzj"><header class="page-header svelte-1btsuzj"><h1 class="svelte-1btsuzj">Workflow Runs</h1></header> <div class="runs-content svelte-1btsuzj"><div class="filters svelte-1btsuzj">`);
    $$renderer2.select(
      { value: filterStatus, class: "filter-select" },
      ($$renderer3) => {
        $$renderer3.option({ value: "all" }, ($$renderer4) => {
          $$renderer4.push(`All Status`);
        });
        $$renderer3.option({ value: "pending" }, ($$renderer4) => {
          $$renderer4.push(`Pending`);
        });
        $$renderer3.option({ value: "running" }, ($$renderer4) => {
          $$renderer4.push(`Running`);
        });
        $$renderer3.option({ value: "completed" }, ($$renderer4) => {
          $$renderer4.push(`Completed`);
        });
        $$renderer3.option({ value: "failed" }, ($$renderer4) => {
          $$renderer4.push(`Failed`);
        });
        $$renderer3.option({ value: "cancelled" }, ($$renderer4) => {
          $$renderer4.push(`Cancelled`);
        });
      },
      "svelte-1btsuzj"
    );
    $$renderer2.push(` `);
    $$renderer2.select(
      { value: filterWorkflow, class: "filter-select" },
      ($$renderer3) => {
        $$renderer3.option({ value: "all" }, ($$renderer4) => {
          $$renderer4.push(`All Workflows`);
        });
        $$renderer3.push(`<!--[-->`);
        const each_array = ensure_array_like(workflows);
        for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
          let workflow = each_array[$$index];
          $$renderer3.option({ value: workflow.id }, ($$renderer4) => {
            $$renderer4.push(`${escape_html(workflow.name)}`);
          });
        }
        $$renderer3.push(`<!--]-->`);
      },
      "svelte-1btsuzj"
    );
    $$renderer2.push(`</div> `);
    if (filtered.length === 0) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="empty-state svelte-1btsuzj"><p class="empty-icon svelte-1btsuzj">🏃</p> <p class="empty-text svelte-1btsuzj">No runs found</p></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<div class="runs-grid svelte-1btsuzj"><!--[-->`);
      const each_array_1 = ensure_array_like(filtered);
      for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
        let run = each_array_1[$$index_1];
        RunCard($$renderer2, {
          run
        });
      }
      $$renderer2.push(`<!--]--></div>`);
    }
    $$renderer2.push(`<!--]--></div></div>`);
  });
}
export {
  _page as default
};
