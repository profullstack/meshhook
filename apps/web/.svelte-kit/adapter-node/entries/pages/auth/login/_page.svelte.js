import { h as head, a as attr } from "../../../../chunks/index2.js";
import { a as createClient } from "../../../../chunks/supabase.js";
import "@sveltejs/kit/internal";
import "../../../../chunks/exports.js";
import "../../../../chunks/utils2.js";
import "@sveltejs/kit/internal/server";
import "../../../../chunks/state.svelte.js";
import { U as escape_html } from "../../../../chunks/context.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let email = "";
    let password = "";
    let loading = false;
    createClient();
    head($$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Login - MeshHook</title>`);
      });
    });
    $$renderer2.push(`<div class="auth-container svelte-1i2smtp"><div class="auth-card svelte-1i2smtp"><h1 class="svelte-1i2smtp">Sign In to MeshHook</h1> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <form><div class="form-group svelte-1i2smtp"><label for="email" class="svelte-1i2smtp">Email</label> <input id="email" type="email"${attr("value", email)} placeholder="you@example.com" required${attr("disabled", loading, true)} class="svelte-1i2smtp"/></div> <div class="form-group svelte-1i2smtp"><label for="password" class="svelte-1i2smtp">Password</label> <input id="password" type="password"${attr("value", password)} placeholder="••••••••" required${attr("disabled", loading, true)} class="svelte-1i2smtp"/></div> <div class="button-group svelte-1i2smtp"><button type="submit" class="primary svelte-1i2smtp"${attr("disabled", loading, true)}>${escape_html("Sign In")}</button> <button type="button" class="secondary svelte-1i2smtp"${attr("disabled", loading, true)}>Sign Up</button></div></form> <p class="help-text svelte-1i2smtp">Don't have an account? Click "Sign Up" to create one.</p></div></div>`);
  });
}
export {
  _page as default
};
