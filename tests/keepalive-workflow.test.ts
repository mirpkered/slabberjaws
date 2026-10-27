import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { validateKeepaliveConnectionUri } from "../scripts/validate-supabase-keepalive-uri.mjs";

const workflow = readFileSync(
  new URL("../.github/workflows/supabase-keepalive.yml", import.meta.url),
  "utf8",
);
const validator = readFileSync(
  new URL("../scripts/validate-supabase-keepalive-uri.mjs", import.meta.url),
  "utf8",
);

test("Supabase keepalive is scheduled, manually runnable, and read-only", () => {
  assert.match(workflow, /cron:\s*["']23 7 \* \* \*["']/);
  assert.match(workflow, /^\s+workflow_dispatch:\s*$/m);
  assert.match(workflow, /contents:\s*read/);
  assert.match(workflow, /secrets\.SUPABASE_KEEPALIVE_DB_URL/);
  assert.match(validator, /kewynepvspcmrujustds/);
  assert.match(validator, /slabberjaws_keepalive/);
  assert.match(workflow, /node scripts\/validate-supabase-keepalive-uri\.mjs/);
  assert.match(workflow, /actions\/checkout@v4/);
  assert.match(workflow, /--command 'SELECT 1;'/);
  assert.match(workflow, /\[\[ "\$result" != "1" \]\]/);
  assert.doesNotMatch(workflow, /service_role|\b(insert|update|delete|truncate)\b/i);
});

const project = "kewynepvspcmrujustds";
const pass = "not-a-real-test-password";

function expectCategory(uri: string, expected: string) {
  assert.throws(
    () => validateKeepaliveConnectionUri(uri),
    (error: unknown) => {
      assert.equal((error as { category?: string }).category, expected);
      assert.doesNotMatch(String(error), /not-a-real-test-password|postgres:\/\//i);
      return true;
    },
  );
}

test("accepts the restricted direct connection URI", () => {
  assert.deepEqual(
    validateKeepaliveConnectionUri(
      `postgresql://slabberjaws_keepalive:${pass}@db.${project}.supabase.co:5432/postgres`,
    ),
    { connectionType: "direct" },
  );
  assert.deepEqual(
    validateKeepaliveConnectionUri(
      `postgres://slabberjaws_keepalive:${pass}@db.${project}.supabase.co/postgres`,
    ),
    { connectionType: "direct" },
  );
});

test("accepts the exact Supabase shared session pooler URI", () => {
  assert.deepEqual(
    validateKeepaliveConnectionUri(
      `postgresql://slabberjaws_keepalive.${project}:${pass}@aws-0-us-east-1.pooler.supabase.com:5432/postgres`,
    ),
    { connectionType: "session-pooler" },
  );
});

test("rejects the default postgres account as a database username", () => {
  expectCategory(
    `postgresql://postgres:${pass}@aws-0-us-east-1.pooler.supabase.com:5432/postgres`,
    "Wrong database username",
  );
});

test("reports each URI validation category without echoing supplied values", () => {
  expectCategory("not a URI", "Invalid URI");
  expectCategory(
    `https://slabberjaws_keepalive:${pass}@db.${project}.supabase.co/postgres`,
    "Wrong protocol",
  );
  expectCategory(
    `postgres://slabberjaws_keepalive:${pass}@evil.example/postgres`,
    "Wrong hostname",
  );
  expectCategory(
    `postgres://wrong-user:${pass}@db.${project}.supabase.co/postgres`,
    "Wrong database username",
  );
  expectCategory(
    `postgres://slabberjaws_keepalive:${pass}@db.${project}.supabase.co/other`,
    "Wrong database name",
  );
  expectCategory(
    `postgres://slabberjaws_keepalive.${project}:${pass}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`,
    "Wrong port",
  );
  expectCategory(
    `postgres://slabberjaws_keepalive@db.${project}.supabase.co/postgres`,
    "Missing password",
  );
});

test("validator CLI reports only the category and expected config, never URI values", () => {
  const submitted =
    "postgresql://wrong-user:sentinel-password@wrong-host.invalid/other";
  const result = spawnSync(
    process.execPath,
    [fileURLToPath(new URL("../scripts/validate-supabase-keepalive-uri.mjs", import.meta.url))],
    { encoding: "utf8", env: { ...process.env, DATABASE_URL: submitted } },
  );
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;

  assert.equal(result.status, 1);
  assert.match(output, /Wrong hostname/);
  assert.match(output, /Expected configuration:/);
  assert.doesNotMatch(output, /wrong-user|sentinel-password|wrong-host\.invalid|postgresql:\/\//i);
});

