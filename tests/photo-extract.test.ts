import test from "node:test";
import assert from "node:assert/strict";
import { emptyPhotoFields, extractPhotoFields, mergeOcrFields } from "../photo/extract.ts";
import { fullCrop, sourceCrop, validCrop } from "../photo/crop.ts";

test("photo OCR extraction preserves an explicitly labelled leading-zero cert", () => {
  const result = extractPhotoFields("CERTIFICATION NUMBER: 00409451\nGRADE: 9.5\nBRAND: Topps\nSET: Chrome");
  assert.equal(result.fields.certNumber, "00409451");
  assert.equal(result.fields.grade, "9.5");
  assert.equal(result.fields.brand, "Topps");
  assert.equal(result.fields.set, "Chrome");
});

test("photo OCR does not mistake copyright dates or arbitrary numbers for card details", () => {
  const result = extractPhotoFields("© 1989 Example Printing 12345\nGEM MINT 10\nCard # 7");
  assert.deepEqual(result.fields, { ...emptyPhotoFields(), grade: "10", cardNumber: "7" });
});

test("photo OCR combines front and back label text conservatively", () => {
  const result = extractPhotoFields("PLAYER: Jane Doe\nGRADE: 10", "CERT NO: 00012345\nYEAR: 2024\nCARD NUMBER: RC-1");
  assert.deepEqual(result.fields, { certNumber: "00012345", grade: "10", year: "2024", brand: "", set: "", subject: "Jane Doe", cardNumber: "RC-1", variant:"" });
});

test("photo entry keeps temporary imagery local and hands off to manual details", async () => {
  const source = await import("node:fs/promises").then((fs) => fs.readFile(new URL("../photo/PhotoEntry.tsx", import.meta.url), "utf8"));
  assert.match(source, /capture="environment"/);
  assert.match(source, /URL\.revokeObjectURL/);
  assert.match(source, /onManualDetails\(grader/);
  assert.doesNotMatch(source, /localStorage|indexedDB|supabase|fetch\(/i);
});

test("crop coordinates stay in source-image bounds and reset to the full photo",()=>{
  assert.deepEqual(fullCrop(),{x:0,y:0,width:100,height:100});
  assert.deepEqual(validCrop({x:-8,y:95,width:120,height:20}),{x:0,y:80,width:100,height:20});
  assert.deepEqual(sourceCrop({x:10,y:20,width:50,height:40},4000,3000),{x:400,y:600,width:2000,height:1200});
});
test("unlabelled slab text becomes review candidates, not silently committed",()=>{
  const result=extractPhotoFields("1999 POKEMON GAME\nCHARIZARD\nHOLO\nGRADE 8");
  assert.equal(result.fields.grade,"8");assert.equal(result.fields.year,"");
  assert.ok(result.candidates.some(x=>x.field==='year'&&x.value==='1999'));
  assert.ok(result.candidates.some(x=>x.field==='subject'&&x.value==='CHARIZARD'));
});
test("user corrections survive a later OCR run",()=>{
  const current={...emptyPhotoFields(),subject:'My correction'};const next={...emptyPhotoFields(),subject:'OCR replacement',grade:'9'};
  assert.deepEqual(mergeOcrFields(current,next,new Set(['subject'])),{...current,grade:'9'});
});
