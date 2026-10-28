import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getAuthMode,
  hasEmailCodes,
  hasGoogle,
  isAdmin,
  isInvited,
  safeNext,
} from "./auth-mode";

test("accounts turn on with BETTER_AUTH_SECRET, and production refuses to run open", () => {
  assert.deepEqual(getAuthMode({}), { kind: "open" });
  assert.deepEqual(getAuthMode({ NODE_ENV: "production" }), {
    kind: "misconfigured",
  });
  assert.deepEqual(
    getAuthMode({ NODE_ENV: "production", STUDIO_ALLOW_OPEN: "1" }),
    { kind: "open" },
  );
  assert.deepEqual(getAuthMode({ BETTER_AUTH_SECRET: "s" }), {
    kind: "accounts",
  });
  assert.deepEqual(
    getAuthMode({ BETTER_AUTH_SECRET: "s", NODE_ENV: "production" }),
    { kind: "accounts" },
  );
});

test("email codes need Resend in production, and print to the log otherwise", () => {
  assert.equal(hasEmailCodes({}), true);
  assert.equal(hasEmailCodes({ NODE_ENV: "production" }), false);
  assert.equal(
    hasEmailCodes({ NODE_ENV: "production", RESEND_API_KEY: "k" }),
    false,
  );
  assert.equal(
    hasEmailCodes({
      NODE_ENV: "production",
      RESEND_API_KEY: "k",
      EMAIL_FROM: "a@b.c",
    }),
    true,
  );
});

test("Google needs both its id and secret", () => {
  assert.equal(hasGoogle({}), false);
  assert.equal(hasGoogle({ GOOGLE_CLIENT_ID: "id" }), false);
  assert.equal(
    hasGoogle({ GOOGLE_CLIENT_ID: "id", GOOGLE_CLIENT_SECRET: "s" }),
    true,
  );
});

test("with accounts, only ADMIN_EMAILS manage keys; without, everyone does", () => {
  assert.equal(isAdmin(undefined, {}), true);
  const env = {
    BETTER_AUTH_SECRET: "s",
    ADMIN_EMAILS: " Teacher@School.org , other@x.com",
  };
  assert.equal(isAdmin("teacher@school.org", env), true);
  assert.equal(isAdmin("OTHER@x.com", env), true);
  assert.equal(isAdmin("someone@else.com", env), false);
  assert.equal(isAdmin(undefined, env), false);
  assert.equal(isAdmin("a@b.c", { BETTER_AUTH_SECRET: "s" }), false);
});

test("after signing in, only paths on this site are followed", () => {
  assert.equal(safeNext("/projects/a?x=1"), "/projects/a?x=1");
  assert.equal(safeNext("https://evil.example"), "/");
  assert.equal(safeNext("//evil.example"), "/");
  assert.equal(safeNext("/\\evil.example"), "/");
  assert.equal(safeNext(undefined), "/");
});

test("with an invite list, only invited emails and admins can sign in", () => {
  assert.equal(isInvited("anyone@x.com", {}), true);
  const env = {
    INVITED_EMAILS: "Teacher@School.org, second@x.com ",
    ADMIN_EMAILS: "me@studio.com",
  };
  assert.equal(isInvited("teacher@school.org", env), true);
  assert.equal(isInvited(" SECOND@x.com", env), true);
  assert.equal(isInvited("me@studio.com", env), true);
  assert.equal(isInvited("stranger@x.com", env), false);
});
