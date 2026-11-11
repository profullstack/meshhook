import { describe, expect, it } from "vitest";
import { scrub, secretNames, testNode } from "./orchestrator.mjs";

const n = (id, type, config = {}) => ({ id, data: { type, config } });

describe("step secrets", () => {
  it("collects names from templates, plugin auth and loop bodies", () => {
    const loop = n("L", "loop", { items: "body" });
    const graph = { loopBody: (id) => (id === "L" ? [n("a", "httpCall", { headers: { "X-Key": "{{$secrets.INNER}}" } })] : []) };
    expect(secretNames(n("h", "httpCall", { url: "https://x.test/?k={{$secrets.Q}}" }), graph)).toEqual(["Q"]);
    expect(secretNames(loop, graph)).toEqual(["INNER"]);
    expect(secretNames(n("p", "plugin", { plugin: "myip", action: "getIp" }), graph)).toEqual([]);
  });

  it("scrubs opened values from what is logged", () => {
    expect(scrub("GET https://x.test/?k=fixture-value: HTTP 401", ["fixture-value"])).toBe("GET https://x.test/?k=***: HTTP 401");
    expect(scrub({ echo: { auth: "Bearer fixture-value" } }, ["fixture-value"])).toEqual({ echo: { auth: "Bearer ***" } });
    expect(scrub({ a: 1 }, [])).toEqual({ a: 1 });
  });
});

describe("builder test-node", () => {
  const q = { oneOrNone: async (_sql, [id]) => (id === "p1" ? { owner: "u1" } : null), manyOrNone: async () => [] };
  it("refuses someone else's project", async () => {
    const res = await testNode({ user_id: "u2", project_id: "p1", node: n("t", "transform", { expression: "a" }) }, { q });
    expect(res.status).toBe(404);
  });
  it("runs the node through the engine", async () => {
    const res = await testNode({ user_id: "u1", project_id: "p1", node: n("t", "transform", { expression: "a" }), input: { a: 5 } }, { q });
    expect(await res.json()).toEqual({ success: true, output: 5 });
  });
  it("reports a missing secret instead of calling out", async () => {
    const node = n("h", "httpCall", { url: "https://x.test/", headers: { Authorization: "Bearer {{$secrets.NOPE}}" } });
    const body = await (await testNode({ user_id: "u1", project_id: "p1", node }, { q })).json();
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/No secret named NOPE/);
  });
});
