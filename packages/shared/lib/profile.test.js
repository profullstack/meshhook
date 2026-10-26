// Sign-up profile fields: validated before the user exists, stored after.

import { describe, it, expect } from "vitest";
import { createProfileStore } from "@profullstack/profile";
import { signUpWithProfile } from "./profile.js";

/** An in-memory store over the package's own SQL, so no database is needed. */
async function memoryStore() {
  const { Database } = await import("bun:sqlite");
  const store = createProfileStore(new Database(":memory:"));
  await store.migrate();
  return store;
}

const fakeCreateUser = (created) => async ({ email }) => {
  const user = { id: `u${created.length + 1}`, email: email.trim().toLowerCase() };
  created.push(user);
  return user;
};

describe("signUpWithProfile", () => {
  it("stores the six fields, normalized, for the new user", async () => {
    const store = await memoryStore();
    const created = [];
    const r = await signUpWithProfile(
      {
        email: "Ada@Acme.com",
        password: "correct horse battery",
        first_name: "Ada",
        last_name: "Lovelace",
        company_domain: "https://www.acme.com/about",
        job_title: "VP Engineering",
        linkedin_url: "in/ada-lovelace",
      },
      { createUser: fakeCreateUser(created), store },
    );
    expect(r.ok).toBe(true);
    expect(await store.get(r.user.id)).toMatchObject({
      email: "ada@acme.com",
      first_name: "Ada",
      last_name: "Lovelace",
      company_domain: "acme.com",
      job_title: "VP Engineering",
      linkedin_url: "https://www.linkedin.com/in/ada-lovelace",
    });
  });

  it("refuses a sign-up without first and last name before creating the user", async () => {
    const created = [];
    const r = await signUpWithProfile(
      { email: "bob@example.com", password: "correct horse battery" },
      { createUser: fakeCreateUser(created), store: await memoryStore() },
    );
    expect(r.ok).toBe(false);
    expect(Object.keys(r.errors).sort()).toEqual(["first_name", "last_name"]);
    expect(created).toHaveLength(0);
  });
});
