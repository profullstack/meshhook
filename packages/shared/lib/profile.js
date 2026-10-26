/**
 * Signup profile (@profullstack/profile) on the shared Postgres client.
 * Table: user_profiles keyed by users.id (migrations-pg/0006_user_profiles.sql).
 */

import { createProfileStore, saveSignupProfile, validateProfile } from "@profullstack/profile";
import { getClient } from "./db.js";

/** The profile fields the signup form asks for besides its own email box. */
export const SIGNUP_PROFILE_FIELDS = ["first_name", "last_name", "company_domain", "job_title", "linkedin_url"];

let store;

/** Lazily created, so importing this module never connects. Pass a client to override (tests). */
export function profileStore(client) {
  if (client) return createProfileStore(client);
  store ??= createProfileStore(getClient());
  return store;
}

/**
 * Sign-up with the profile fields: validate them BEFORE the account exists,
 * create the user, then save the profile. A failed profile save never blocks
 * the sign-up (the person can fill it in later through /api/v1/me/profile).
 *
 * @param {Record<string, any>} input  form fields: email, password and the profile fields
 * @param {{ createUser: (u: { email: string, password: any }) => Promise<any>, store?: any }} deps
 * @returns {Promise<{ ok: boolean, user?: any, errors?: Record<string, string> }>}
 * @throws whatever createUser throws (bad email or password, address taken).
 */
export async function signUpWithProfile(input, { createUser, store = profileStore() }) {
  const email = input.email == null ? "" : String(input.email);
  const check = validateProfile({ ...input, email });
  if (!check.ok) return { ok: false, errors: check.errors };
  const user = await createUser({ email, password: input.password });
  try {
    await saveSignupProfile(store, user.id, { ...input, email: user.email }, { email: user.email });
  } catch (e) {
    console.error("[meshhook] signup profile save failed:", e instanceof Error ? e.message : e);
  }
  return { ok: true, user };
}
