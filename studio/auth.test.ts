import assert from "node:assert/strict";
import { test } from "node:test";
import {
  checkPassword,
  createSession,
  getGate,
  safeNext,
  SESSION_SECONDS,
  verifySession,
} from "./auth";

test("the gate is open locally, locked with a password, and refuses to run open in production", () => {
  assert.deepEqual(getGate({}), { kind: "open" });
  assert.deepEqual(getGate({ NODE_ENV: "production" }), {
    kind: "misconfigured",
  });
  assert.deepEqual(
    getGate({ NODE_ENV: "production", STUDIO_ALLOW_OPEN: "1" }),
    { kind: "open" },
  );
  assert.deepEqual(getGate({ STUDIO_PASSWORD: "pw" }), {
    kind: "password",
    password: "pw",
    secret: "pw",
  });
  assert.deepEqual(
    getGate({ STUDIO_PASSWORD: "pw", STUDIO_SESSION_SECRET: "s" }),
    { kind: "password", password: "pw", secret: "s" },
  );
});

test("passwords match only exactly", async () => {
  assert.equal(await checkPassword("correct horse", "correct horse"), true);
  assert.equal(await checkPassword("correct hors", "correct horse"), false);
  assert.equal(await checkPassword("", "correct horse"), false);
});

test("a session is valid until it expires, and only with its own secret", async () => {
  const now = Date.UTC(2026, 9, 27);
  const session = await createSession("secret", now);
  assert.equal(await verifySession(session, "secret", now), true);
  assert.equal(await verifySession(session, "other", now), false);
  assert.equal(
    await verifySession(session, "secret", now + SESSION_SECONDS * 1000 + 1),
    false,
  );

  const [expires, signature] = session.split(".");
  const later = `${Number(expires) + 1000}.${signature}`;
  assert.equal(await verifySession(later, "secret", now), false);
  assert.equal(await verifySession(undefined, "secret", now), false);
  assert.equal(await verifySession("nonsense", "secret", now), false);
  assert.equal(await verifySession(`${session}.x`, "secret", now), false);
});

test("after signing in, only paths on this site are followed", () => {
  assert.equal(safeNext("/projects/a?x=1"), "/projects/a?x=1");
  assert.equal(safeNext("https://evil.example"), "/");
  assert.equal(safeNext("//evil.example"), "/");
  assert.equal(safeNext("/\\evil.example"), "/");
  assert.equal(safeNext(undefined), "/");
});
