import { h as head } from "../../chunks/index2.js";
import { U as escape_html } from "../../chunks/context.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    head($$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>MeshHook - Workflow Engine</title>`);
      });
      $$renderer3.push(`<meta name="description" content="Webhook-first, deterministic workflow engine"/>`);
    });
    $$renderer2.push(`<div class="container svelte-1uha8ag"><h1 class="svelte-1uha8ag">Welcome to MeshHook</h1> <section class="intro svelte-1uha8ag"><p>A webhook-first, deterministic, Postgres-native workflow engine that delivers n8n's visual
			simplicity and Temporal's durability without restrictive licensing.</p></section> `);
    if (data.session) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<section class="user-info svelte-1uha8ag"><p>Logged in as: ${escape_html(data.session.user.email)}</p> <nav class="svelte-1uha8ag"><a href="/workflows" class="svelte-1uha8ag">Workflows</a> <a href="/runs" class="svelte-1uha8ag">Runs</a> <a href="/secrets" class="svelte-1uha8ag">Secrets</a></nav></section>`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<section class="auth svelte-1uha8ag"><p>Please sign in to continue</p> <a href="/auth/login" class="button svelte-1uha8ag">Sign In</a></section>`);
    }
    $$renderer2.push(`<!--]--></div>`);
  });
}
export {
  _page as default
};
