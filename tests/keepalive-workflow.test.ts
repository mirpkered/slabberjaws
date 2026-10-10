import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workflow = readFileSync(
  new URL("../.github/workflows/supabase-keepalive.yml", import.meta.url),
  "utf8",
);

test("Supabase keepalive is scheduled, manually runnable, and read-only", () => {
  assert.match(workflow, /cron:\s*["']23 7 \*\/3 \* \*["']/);
  assert.match(workflow, /^\s+workflow_dispatch:\s*$/m);
  assert.match(workflow, /contents:\s*read/);
  assert.match(workflow, /secrets\.SUPABASE_KEEPALIVE_DB_URL/);
  assert.match(workflow, /kewynepvspcmrujustds/);
  assert.match(workflow, /slabberjaws_keepalive/);
  assert.match(workflow, /--command 'SELECT 1;'/);
  assert.match(workflow, /\[\[ "\$result" != "1" \]\]/);
  assert.doesNotMatch(workflow, /service_role|\b(insert|update|delete|truncate)\b/i);
});
