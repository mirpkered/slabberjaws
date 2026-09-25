import test from "node:test";
import assert from "node:assert/strict";
import { emptyPhotoFields, extractPhotoFields, fieldsFromConfidentRegions, mergeOcrFields } from "../photo/extract.ts";
import { containedImageRect, fullCrop, moveCropByDisplayDelta, resizeCropByDisplayDelta, sourceCrop, validCrop } from "../photo/crop.ts";

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
test("crop interaction maps display pixels through contained portrait and landscape image geometry",()=>{
  const portrait=containedImageRect(1200,1600,600,400);
  assert.deepEqual(portrait,{x:150,y:0,width:300,height:400});
  const landscape=containedImageRect(1600,900,400,400);
  assert.deepEqual(landscape,{x:0,y:87.5,width:400,height:225});
  assert.deepEqual(moveCropByDisplayDelta({x:20,y:20,width:50,height:50},30,40,portrait),{x:30,y:30,width:50,height:50});
  assert.deepEqual(resizeCropByDisplayDelta({x:20,y:20,width:50,height:50},60,90,portrait),{x:20,y:20,width:70,height:72.5});
  assert.deepEqual(moveCropByDisplayDelta({x:80,y:80,width:20,height:20},100,100,landscape),{x:80,y:80,width:20,height:20});
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
test("OCR offers restrained editable label candidates without committing uncertain values",()=>{
  const result=extractPhotoFields("CSG\n/021 Topps pil =\nDylan Carlson\n#285\n8.5", "1012833027");
  assert.equal(result.fields.certNumber, "");
  assert.equal(result.fields.year, "");
  assert.ok(result.candidates.some(candidate=>candidate.field==='certNumber'&&candidate.value==='1012833027'));
  assert.ok(result.candidates.some(candidate=>candidate.field==='brand'&&candidate.value==='Topps'));
  assert.ok(result.candidates.some(candidate=>candidate.field==='year'&&candidate.value==='2021'));
  assert.ok(result.candidates.some(candidate=>candidate.field==='subject'&&candidate.value==='Dylan Carlson'));
  assert.ok(result.candidates.some(candidate=>candidate.field==='cardNumber'&&candidate.value==='285'));
  assert.ok(result.candidates.some(candidate=>candidate.field==='grade'&&candidate.value==='8.5'));
});
test("weak OCR regions remain review-only instead of auto-filling card fields",()=>{
  assert.deepEqual(fieldsFromConfidentRegions([{text:'CERTIFICATION NUMBER: 1012833027\nGRADE: 8.5',confidence:34}]),emptyPhotoFields());
  assert.equal(fieldsFromConfidentRegions([{text:'CERTIFICATION NUMBER: 001012833027\nGRADE: 8.5',confidence:76}]).certNumber,'001012833027');
});
