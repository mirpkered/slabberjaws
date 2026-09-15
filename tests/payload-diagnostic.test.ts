import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseScanPayload } from '../scanner/payload.ts';

const entry=readFileSync(new URL('../scanner/ScanEntry.tsx',import.meta.url),'utf8');
test('recognized certifications retain the normal scan path',()=>assert.equal(parseScanPayload('00409451').certNumber,'00409451'));
test('unrecognized successful payload remains available for diagnostic display',()=>{
  const raw='https://verification.example/record/opaque-token';
  assert.deepEqual(parseScanPayload(raw),{rawPayload:raw});
  assert.match(entry,/DECODED RAW DATA/);assert.match(entry,/payload\.rawPayload/);assert.match(entry,/navigator\.clipboard\.writeText/);
});
test('diagnostic UI does not navigate decoded URLs and rescan clears it',()=>{
  assert.doesNotMatch(entry,/window\.location|location\.href|open\(payload\.rawPayload/);
  assert.match(entry,/setPayload\(null\).*setCert\(''\).*setGrader\(''\)/);
});
