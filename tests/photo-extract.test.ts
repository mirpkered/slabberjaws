import test from "node:test";
import assert from "node:assert/strict";
import { emptyPhotoFields, extractPhotoFields } from "../photo/extract.ts";

test("photo OCR extraction preserves an explicitly labelled leading-zero cert", () => {
  const result = extractPhotoFields("CERTIFICATION NUMBER: 00409451\nGRADE: 9.5\nBRAND: Topps\nSET: Chrome");
  assert.equal(result.certNumber, "00409451");
  assert.equal(result.grade, "9.5");
  assert.equal(result.brand, "Topps");
  assert.equal(result.set, "Chrome");
});

test("photo OCR does not mistake copyright dates or arbitrary numbers for card details", () => {
  const result = extractPhotoFields("© 1989 Example Printing 12345\nGEM MINT 10\nCard # 7");
  assert.deepEqual(result, { ...emptyPhotoFields(), grade: "10", cardNumber: "7" });
});

test("photo OCR combines front and back label text conservatively", () => {
  const result = extractPhotoFields("PLAYER: Jane Doe\nGRADE: 10", "CERT NO: 00012345\nYEAR: 2024\nCARD NUMBER: RC-1");
  assert.deepEqual(result, { certNumber: "00012345", grade: "10", year: "2024", brand: "", set: "", subject: "Jane Doe", cardNumber: "RC-1" });
});

test("photo entry keeps temporary imagery local and hands off to manual details", async () => {
  const source = await import("node:fs/promises").then((fs) => fs.readFile(new URL("../photo/PhotoEntry.tsx", import.meta.url), "utf8"));
  assert.match(source, /capture="environment"/);
  assert.match(source, /URL\.revokeObjectURL/);
  assert.match(source, /onManualDetails\(grader/);
  assert.doesNotMatch(source, /localStorage|indexedDB|supabase|fetch\(/i);
});
