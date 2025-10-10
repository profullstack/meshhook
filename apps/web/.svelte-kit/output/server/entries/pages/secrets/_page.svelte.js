import { a as attr, d as bind_props, c as ensure_array_like, h as head } from "../../../chunks/index2.js";
import { U as escape_html } from "../../../chunks/context.js";
function MaskedInput($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      value = "",
      placeholder = "",
      disabled = false,
      readonly = false
    } = $$props;
    const maskedValue = "•".repeat(Math.min(value.length, 20));
    $$renderer2.push(`<div class="masked-input svelte-f3n6kn"><div class="input-container svelte-f3n6kn">`);
    {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<input type="text"${attr("value", maskedValue)}${attr("placeholder", placeholder)} disabled readonly class="secret-input masked svelte-f3n6kn"/>`);
    }
    $$renderer2.push(`<!--]--></div> <div class="input-actions svelte-f3n6kn"><button type="button" class="btn-icon svelte-f3n6kn"${attr("title", "Show")}${attr("disabled", disabled, true)}>${escape_html("👁️")}</button> `);
    if (value) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<button type="button" class="btn-icon svelte-f3n6kn" title="Copy to clipboard"${attr("disabled", disabled, true)}>${escape_html("📋")}</button>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div></div>`);
    bind_props($$props, { value });
  });
}
function SecretModal($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { secret = null, projects = [], isOpen = false, onSave } = $$props;
    const isEdit = !!secret;
    let formData = { name: "", value: "", project_id: "", description: "" };
    let saving = false;
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      if (isOpen) {
        $$renderer3.push("<!--[-->");
        $$renderer3.push(`<div class="modal-backdrop svelte-114zgz9" role="presentation"><div class="modal svelte-114zgz9" role="dialog" aria-modal="true"><div class="modal-header svelte-114zgz9"><h2 class="svelte-114zgz9">${escape_html(isEdit ? "Edit Secret" : "Create Secret")}</h2> <button class="close-button svelte-114zgz9" aria-label="Close">×</button></div> <div class="modal-body svelte-114zgz9"><form><div class="form-group svelte-114zgz9"><label for="name" class="svelte-114zgz9">Secret Name *</label> <input id="name" type="text"${attr("value", formData.name)} placeholder="API_KEY" required${attr("disabled", isEdit, true)} class="svelte-114zgz9"/> <p class="help-text svelte-114zgz9">Unique identifier for this secret</p></div> <div class="form-group svelte-114zgz9"><label for="value" class="svelte-114zgz9">Secret Value *</label> `);
        MaskedInput($$renderer3, {
          placeholder: "Enter secret value",
          disabled: saving,
          get value() {
            return formData.value;
          },
          set value($$value) {
            formData.value = $$value;
            $$settled = false;
          }
        });
        $$renderer3.push(`<!----> <p class="help-text svelte-114zgz9">The encrypted value will be stored securely</p></div> <div class="form-group svelte-114zgz9"><label for="project" class="svelte-114zgz9">Project *</label> `);
        $$renderer3.select(
          {
            id: "project",
            value: formData.project_id,
            required: true,
            disabled: saving,
            class: ""
          },
          ($$renderer4) => {
            $$renderer4.option({ value: "" }, ($$renderer5) => {
              $$renderer5.push(`Select project`);
            });
            $$renderer4.push(`<!--[-->`);
            const each_array = ensure_array_like(projects);
            for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
              let project = each_array[$$index];
              $$renderer4.option({ value: project.id }, ($$renderer5) => {
                $$renderer5.push(`${escape_html(project.name)}`);
              });
            }
            $$renderer4.push(`<!--]-->`);
          },
          "svelte-114zgz9"
        );
        $$renderer3.push(` <p class="help-text svelte-114zgz9">Scope this secret to a specific project</p></div> <div class="form-group svelte-114zgz9"><label for="description" class="svelte-114zgz9">Description</label> <textarea id="description" placeholder="Optional description..." rows="3"${attr("disabled", saving, true)} class="svelte-114zgz9">`);
        const $$body = escape_html(formData.description);
        if ($$body) {
          $$renderer3.push(`${$$body}`);
        }
        $$renderer3.push(`</textarea></div> <div class="modal-actions svelte-114zgz9"><button type="button" class="btn-secondary svelte-114zgz9"${attr("disabled", saving, true)}>Cancel</button> <button type="submit" class="btn-primary svelte-114zgz9"${attr("disabled", saving, true)}>${escape_html(isEdit ? "Update Secret" : "Create Secret")}</button></div></form></div></div></div>`);
      } else {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]-->`);
    }
    do {
      $$settled = true;
      $$inner_renderer = $$renderer2.copy();
      $$render_inner($$inner_renderer);
    } while (!$$settled);
    $$renderer2.subsume($$inner_renderer);
    bind_props($$props, { isOpen });
  });
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    let secrets = data.secrets || [];
    let projects = data.projects || [];
    let searchQuery = "";
    let filterProject = "all";
    let modalOpen = false;
    let editingSecret = null;
    const filteredSecrets = () => {
      let result = secrets;
      return result;
    };
    const filtered = filteredSecrets();
    async function handleSave(formData) {
      try {
        const url = editingSecret ? `/api/secrets/${editingSecret.id}` : "/api/secrets";
        const method = editingSecret ? "PUT" : "POST";
        const response = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData)
        });
        if (!response.ok) throw new Error("Failed to save secret");
        const result = await response.json();
        if (editingSecret) ;
        else {
          secrets = [result.secret, ...secrets];
        }
      } catch (error) {
        throw error;
      }
    }
    function formatDate(dateString) {
      return new Date(dateString).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    }
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      head($$renderer3, ($$renderer4) => {
        $$renderer4.title(($$renderer5) => {
          $$renderer5.push(`<title>Secrets - MeshHook</title>`);
        });
      });
      $$renderer3.push(`<div class="secrets-page svelte-15swqau"><header class="page-header svelte-15swqau"><h1 class="svelte-15swqau">Secrets Vault</h1> <button class="btn-primary svelte-15swqau">Create Secret</button></header> <div class="secrets-content svelte-15swqau"><div class="controls svelte-15swqau"><input type="search"${attr("value", searchQuery)} placeholder="Search secrets..." class="search-input svelte-15swqau"/> `);
      $$renderer3.select(
        { value: filterProject, class: "filter-select" },
        ($$renderer4) => {
          $$renderer4.option({ value: "all" }, ($$renderer5) => {
            $$renderer5.push(`All Projects`);
          });
          $$renderer4.push(`<!--[-->`);
          const each_array = ensure_array_like(projects);
          for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
            let project = each_array[$$index];
            $$renderer4.option({ value: project.id }, ($$renderer5) => {
              $$renderer5.push(`${escape_html(project.name)}`);
            });
          }
          $$renderer4.push(`<!--]-->`);
        },
        "svelte-15swqau"
      );
      $$renderer3.push(`</div> `);
      if (filtered.length === 0) {
        $$renderer3.push("<!--[-->");
        $$renderer3.push(`<div class="empty-state svelte-15swqau"><p class="empty-icon svelte-15swqau">🔐</p> <p class="empty-text svelte-15swqau">${escape_html("No secrets yet")}</p> `);
        {
          $$renderer3.push("<!--[-->");
          $$renderer3.push(`<button class="btn-primary svelte-15swqau">Create Your First Secret</button>`);
        }
        $$renderer3.push(`<!--]--></div>`);
      } else {
        $$renderer3.push("<!--[!-->");
        $$renderer3.push(`<div class="secrets-table svelte-15swqau"><table class="svelte-15swqau"><thead class="svelte-15swqau"><tr><th class="svelte-15swqau">Name</th><th class="svelte-15swqau">Project</th><th class="svelte-15swqau">Value</th><th class="svelte-15swqau">Created</th><th class="svelte-15swqau">Last Used</th><th class="svelte-15swqau">Actions</th></tr></thead><tbody class="svelte-15swqau"><!--[-->`);
        const each_array_1 = ensure_array_like(filtered);
        for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
          let secret = each_array_1[$$index_1];
          $$renderer3.push(`<tr class="svelte-15swqau"><td class="secret-name svelte-15swqau">${escape_html(secret.name)}</td><td class="svelte-15swqau">${escape_html(secret.project?.name || "Unknown")}</td><td class="secret-value svelte-15swqau">`);
          MaskedInput($$renderer3, { value: secret.value || "••••••••", readonly: true });
          $$renderer3.push(`<!----></td><td class="svelte-15swqau">${escape_html(formatDate(secret.created_at))}</td><td class="svelte-15swqau">${escape_html(secret.last_used_at ? formatDate(secret.last_used_at) : "Never")}</td><td class="actions svelte-15swqau"><button class="btn-action svelte-15swqau">Edit</button> <button class="btn-action btn-danger svelte-15swqau">Delete</button></td></tr>`);
        }
        $$renderer3.push(`<!--]--></tbody></table></div>`);
      }
      $$renderer3.push(`<!--]--></div> `);
      SecretModal($$renderer3, {
        secret: editingSecret,
        projects,
        onSave: handleSave,
        get isOpen() {
          return modalOpen;
        },
        set isOpen($$value) {
          modalOpen = $$value;
          $$settled = false;
        }
      });
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
