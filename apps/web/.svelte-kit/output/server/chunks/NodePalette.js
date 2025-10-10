import { c as ensure_array_like, f as attr_class } from "./index2.js";
import { U as escape_html } from "./context.js";
function NodePalette($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const nodeCategories = [
      {
        name: "Triggers",
        nodes: [
          {
            type: "webhook",
            label: "Webhook",
            icon: "🔗",
            description: "Trigger workflow via HTTP webhook"
          },
          {
            type: "schedule",
            label: "Schedule",
            icon: "⏰",
            description: "Trigger workflow on a schedule"
          }
        ]
      },
      {
        name: "Actions",
        nodes: [
          {
            type: "httpCall",
            label: "HTTP Call",
            icon: "🌐",
            description: "Make HTTP request to external API"
          },
          {
            type: "transform",
            label: "Transform",
            icon: "🔄",
            description: "Transform data using JMESPath"
          },
          {
            type: "delay",
            label: "Delay",
            icon: "⏱️",
            description: "Wait for specified duration"
          }
        ]
      },
      {
        name: "Logic",
        nodes: [
          {
            type: "conditional",
            label: "Conditional",
            icon: "🔀",
            description: "Branch based on condition"
          },
          {
            type: "loop",
            label: "Loop",
            icon: "🔁",
            description: "Iterate over array items"
          }
        ]
      },
      {
        name: "Control",
        nodes: [
          {
            type: "terminate",
            label: "Terminate",
            icon: "🛑",
            description: "End workflow execution"
          }
        ]
      }
    ];
    let expandedCategories = /* @__PURE__ */ new Set(["Triggers", "Actions"]);
    $$renderer2.push(`<div class="node-palette svelte-1bh5o6n"><div class="palette-header svelte-1bh5o6n"><h3 class="svelte-1bh5o6n">Node Palette</h3> <p class="hint svelte-1bh5o6n">Drag nodes to canvas</p></div> <div class="palette-content svelte-1bh5o6n"><!--[-->`);
    const each_array = ensure_array_like(nodeCategories);
    for (let $$index_1 = 0, $$length = each_array.length; $$index_1 < $$length; $$index_1++) {
      let category = each_array[$$index_1];
      $$renderer2.push(`<div class="category svelte-1bh5o6n"><button${attr_class("category-header svelte-1bh5o6n", void 0, { "expanded": expandedCategories.has(category.name) })}><span class="category-icon svelte-1bh5o6n">${escape_html(expandedCategories.has(category.name) ? "▼" : "▶")}</span> <span class="category-name svelte-1bh5o6n">${escape_html(category.name)}</span> <span class="category-count svelte-1bh5o6n">${escape_html(category.nodes.length)}</span></button> `);
      if (expandedCategories.has(category.name)) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<div class="category-nodes svelte-1bh5o6n"><!--[-->`);
        const each_array_1 = ensure_array_like(category.nodes);
        for (let $$index = 0, $$length2 = each_array_1.length; $$index < $$length2; $$index++) {
          let node = each_array_1[$$index];
          $$renderer2.push(`<div class="node-item svelte-1bh5o6n" draggable="true" role="button" tabindex="0"><div class="node-icon svelte-1bh5o6n">${escape_html(node.icon)}</div> <div class="node-info svelte-1bh5o6n"><div class="node-label svelte-1bh5o6n">${escape_html(node.label)}</div> <div class="node-description svelte-1bh5o6n">${escape_html(node.description)}</div></div></div>`);
        }
        $$renderer2.push(`<!--]--></div>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--></div>`);
    }
    $$renderer2.push(`<!--]--></div></div>`);
  });
}
export {
  NodePalette as N
};
