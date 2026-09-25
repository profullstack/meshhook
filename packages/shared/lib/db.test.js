/**
 * The parts of the database layer that need no database: the connection guard
 * and the placeholder rewrite.
 */
import { describe, it, expect } from "vitest";
import { resolveConnection, toLibsqlSql, toBindable, json } from "./db.js";

describe("resolveConnection", () => {
  it("accepts postgres:// and postgresql://", () => {
    expect(resolveConnection({ DATABASE_URL: "postgres://u:p@h:5432/d" })).toEqual({
      url: "postgres://u:p@h:5432/d",
    });
    expect(resolveConnection({ DATABASE_URL: "postgresql://u:p@h/d" }).url).toBe(
      "postgresql://u:p@h/d",
    );
  });

  it("fails fast when DATABASE_URL is unset", () => {
    expect(() => resolveConnection({})).toThrow(/DATABASE_URL is not set/);
  });

  it("names a leftover Turso setting and the copy recipe", () => {
    expect(() => resolveConnection({ TURSO_DATABASE_URL: "libsql://x.turso.io" })).toThrow(
      /TURSO_DATABASE_URL is set but no longer read[\s\S]*libsql-pg copy/,
    );
  });

  it("refuses libsql:// and file: rather than falling back", () => {
    expect(() => resolveConnection({ DATABASE_URL: "libsql://x.turso.io" })).toThrow(
      /must be a postgres:\/\//,
    );
    expect(() => resolveConnection({ DATABASE_URL: "file:./meshhook.db" })).toThrow(/got "file:"/);
  });
});

describe("toLibsqlSql", () => {
  it("rewrites ascending $n to ?", () => {
    expect(toLibsqlSql("insert into t (a, b) values ($1, $2)")).toBe(
      "insert into t (a, b) values (?, ?)",
    );
  });

  it("leaves SQL without placeholders and $$ bodies alone", () => {
    expect(toLibsqlSql("select 1")).toBe("select 1");
    expect(toLibsqlSql("select '$1' as literal")).toBe("select '$1' as literal");
  });

  it("refuses repeated or out-of-order $n", () => {
    expect(() => toLibsqlSql("select $2, $1")).toThrow(/expected \$1 but found \$2/);
  });
});

describe("value helpers", () => {
  it("binds booleans as 0/1 and objects as JSON", () => {
    expect(toBindable(true)).toBe(1);
    expect(toBindable(false)).toBe(0);
    expect(toBindable({ a: 1 })).toBe('{"a":1}');
    expect(toBindable(undefined)).toBeNull();
  });

  it("parses JSON text and passes objects through", () => {
    expect(json('{"a":1}')).toEqual({ a: 1 });
    expect(json({ a: 1 })).toEqual({ a: 1 });
    expect(json("not json", {})).toEqual({});
  });
});
