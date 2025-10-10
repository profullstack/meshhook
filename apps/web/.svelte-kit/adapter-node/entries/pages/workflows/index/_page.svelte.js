import { b as attr_style, s as stringify, a as attr, c as ensure_array_like, h as head } from "../../../../chunks/index2.js";
import { U as escape_html } from "../../../../chunks/context.js";
import "@sveltejs/kit/internal";
import "../../../../chunks/exports.js";
import "../../../../chunks/utils2.js";
import "@sveltejs/kit/internal/server";
import "../../../../chunks/state.svelte.js";
function WorkflowCard($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { workflow } = $$props;
    const statusColors = { draft: "#fbbf24", published: "#10b981" };
    const statusColor = statusColors[workflow.status] || "#6b7280";
    function formatDate(dateString) {
      return new Date(dateString).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    }
    $$renderer2.push(`<div class="workflow-card svelte-zdbdul"><div class="card-header svelte-zdbdul"><h3 class="workflow-name svelte-zdbdul">${escape_html(workflow.name)}</h3> <span class="status-badge svelte-zdbdul"${attr_style(`background-color: ${stringify(statusColor)}`)}>${escape_html(workflow.status)}</span></div> `);
    if (workflow.description) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<p class="workflow-description svelte-zdbdul">${escape_html(workflow.description)}</p>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <div class="card-meta svelte-zdbdul"><div class="meta-item svelte-zdbdul"><span class="meta-label svelte-zdbdul">Nodes:</span> <span class="meta-value svelte-zdbdul">${escape_html(workflow.definition?.nodes?.length || 0)}</span></div> <div class="meta-item svelte-zdbdul"><span class="meta-label svelte-zdbdul">Version:</span> <span class="meta-value svelte-zdbdul">${escape_html(workflow.version)}</span></div> <div class="meta-item svelte-zdbdul"><span class="meta-label svelte-zdbdul">Updated:</span> <span class="meta-value svelte-zdbdul">${escape_html(formatDate(workflow.updated_at))}</span></div></div> <div class="card-actions svelte-zdbdul"><button class="btn-action svelte-zdbdul">Edit</button> <button class="btn-action svelte-zdbdul">Duplicate</button> <button class="btn-action btn-danger svelte-zdbdul">Delete</button></div></div>`);
  });
}
function WorkflowList($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { workflows = [] } = $$props;
    let searchQuery = "";
    let sortBy = "updated_at";
    let filterStatus = "all";
    const filteredWorkflows = () => {
      let result = workflows;
      result = [...result].sort((a, b) => {
        {
          return new Date(b.updated_at) - new Date(a.updated_at);
        }
      });
      return result;
    };
    const filtered = filteredWorkflows();
    $$renderer2.push(`<div class="workflow-list svelte-11grnxr"><div class="list-controls svelte-11grnxr"><div class="search-box svelte-11grnxr"><input type="search"${attr("value", searchQuery)} placeholder="Search workflows..." class="search-input svelte-11grnxr"/></div> <div class="filters svelte-11grnxr">`);
    $$renderer2.select(
      { value: filterStatus, class: "filter-select" },
      ($$renderer3) => {
        $$renderer3.option({ value: "all" }, ($$renderer4) => {
          $$renderer4.push(`All Status`);
        });
        $$renderer3.option({ value: "draft" }, ($$renderer4) => {
          $$renderer4.push(`Draft`);
        });
        $$renderer3.option({ value: "published" }, ($$renderer4) => {
          $$renderer4.push(`Published`);
        });
      },
      "svelte-11grnxr"
    );
    $$renderer2.push(` `);
    $$renderer2.select(
      { value: sortBy, class: "filter-select" },
      ($$renderer3) => {
        $$renderer3.option({ value: "updated_at" }, ($$renderer4) => {
          $$renderer4.push(`Recently Updated`);
        });
        $$renderer3.option({ value: "created_at" }, ($$renderer4) => {
          $$renderer4.push(`Recently Created`);
        });
        $$renderer3.option({ value: "name" }, ($$renderer4) => {
          $$renderer4.push(`Name (A-Z)`);
        });
      },
      "svelte-11grnxr"
    );
    $$renderer2.push(`</div></div> `);
    if (filtered.length === 0) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="empty-state svelte-11grnxr"><p class="empty-icon svelte-11grnxr">📋</p> <p class="empty-text svelte-11grnxr">${escape_html("No workflows yet")}</p> `);
      {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<a href="/workflows/new" class="btn-primary svelte-11grnxr">Create Your First Workflow</a>`);
      }
      $$renderer2.push(`<!--]--></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<div class="workflows-grid svelte-11grnxr"><!--[-->`);
      const each_array = ensure_array_like(filtered);
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let workflow = each_array[$$index];
        WorkflowCard($$renderer2, {
          workflow
        });
      }
      $$renderer2.push(`<!--]--></div>`);
    }
    $$renderer2.push(`<!--]--></div>`);
  });
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    let workflows = data.workflows || [];
    head($$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Workflows - MeshHook</title>`);
      });
    });
    $$renderer2.push(`<div class="workflows-page svelte-1ucrgqm"><header class="page-header svelte-1ucrgqm"><h1 class="svelte-1ucrgqm">Workflows</h1> <a href="/workflows/new" class="btn-primary svelte-1ucrgqm">Create Workflow</a></header> `);
    WorkflowList($$renderer2, {
      workflows
    });
    $$renderer2.push(`<!----></div>`);
  });
}
export {
  _page as default
};
