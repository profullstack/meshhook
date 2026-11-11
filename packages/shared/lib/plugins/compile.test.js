import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PLUGINS } from "./catalog.js";
import { compilePluginCall, defaultCredential, pluginCatalog, pluginOutput } from "./compile.js";

describe("plugin catalog", () => {
  it("every plugin and action is well formed", () => {
    const ids = new Set();
    for (const p of PLUGINS) {
      expect(p.id).toMatch(/^[a-z0-9-]+$/);
      expect(ids.has(p.id)).toBe(false);
      ids.add(p.id);
      expect(p.baseUrl).toMatch(/^https:\/\//);
      expect(["bearer", "header", "query", "none"]).toContain(p.auth?.type);
      expect(p.actions.length).toBeGreaterThan(0);
      for (const a of p.actions) {
        expect(a.path.startsWith("/")).toBe(true);
        expect(a.source, `${p.id}.${a.id} needs a source`).toBeTruthy();
        // every {path} placeholder has a path param
        for (const m of a.path.matchAll(/\{([^}]+)\}/g)) {
          expect(a.params.some((q) => q.name === m[1] && q.in === "path"), `${p.id}.${a.id} {${m[1]}}`).toBe(true);
        }
        // and every required param compiles once given a value
        const params = Object.fromEntries(a.params.map((q) => [q.name, q.type === "number" ? "1" : q.type === "json" ? "{}" : q.type === "boolean" ? "true" : "x"]));
        const req = compilePluginCall({ plugin: p.id, action: a.id, params });
        expect(req.url.startsWith(p.baseUrl.replace(/\/$/, ""))).toBe(true);
        expect(req.url).not.toMatch(/\{[^}]+\}/);
      }
    }
    expect(pluginCatalog().length).toBe(PLUGINS.length);
  });
});

describe("compilePluginCall", () => {
  const spec = {
    id: "demo",
    name: "Demo",
    baseUrl: "https://api.demo.test/v1/",
    auth: { type: "bearer", secret: "DEMO_KEY" },
    actions: [
      {
        id: "create",
        label: "Create",
        method: "POST",
        path: "/items/{list}",
        params: [
          { name: "list", in: "path", required: true },
          { name: "amount", in: "body", type: "number", required: true },
          { name: "live", in: "body", type: "boolean" },
          { name: "meta", in: "body", type: "json" },
          { name: "page", in: "query", default: 1 },
        ],
      },
    ],
  };
  beforeAll(() => PLUGINS.push(spec));
  afterAll(() => PLUGINS.splice(PLUGINS.indexOf(spec), 1));

  it("places params, coerces types, adds the auth secret reference", () => {
    const req = compilePluginCall({ plugin: "demo", action: "create", params: { list: "a b", amount: "12.5", live: "true", meta: '{"x":1}' } });
    expect(req.method).toBe("POST");
    expect(req.url).toBe("https://api.demo.test/v1/items/a%20b");
    expect(req.queryParams).toEqual({ page: 1 });
    expect(req.body).toEqual({ amount: 12.5, live: true, meta: { x: 1 } });
    expect(req.headers.Authorization).toBe("Bearer {{$secrets.DEMO_KEY}}");
    expect(req.secretsUsed).toEqual(["DEMO_KEY"]);
  });

  it("keeps templates for run time and merges extra JSON body fields", () => {
    const req = compilePluginCall({ plugin: "demo", action: "create", credential: "MINE", params: { list: "l", amount: "{{body.n}}", $body: '{"note":"{{body.note}}","amount":0}' } });
    expect(req.body).toEqual({ amount: "{{body.n}}", note: "{{body.note}}" });
    expect(req.headers.Authorization).toBe("Bearer {{$secrets.MINE}}");
  });

  it("explains a missing required field or action", () => {
    expect(() => compilePluginCall({ plugin: "demo", action: "create", params: { list: "l" } })).toThrow(/Amount|amount.*required/);
    expect(() => compilePluginCall({ plugin: "demo", action: "nope" })).toThrow(/pick an action/);
    expect(() => compilePluginCall({ plugin: "nope" })).toThrow(/unknown plugin/);
    expect(() => compilePluginCall({ plugin: "demo", action: "create", credential: "a b", params: { list: "l", amount: 1 } })).toThrow(/valid secret name/);
  });

  it("names a default secret and shapes the output", () => {
    expect(defaultCredential({ id: "my-app" })).toBe("MY_APP_API_KEY");
    expect(pluginOutput({ status: 201, data: { id: 7 } })).toEqual({ id: 7, $status: 201 });
    expect(pluginOutput({ status: 200, data: [1] })).toEqual({ data: [1], $status: 200 });
  });
});
