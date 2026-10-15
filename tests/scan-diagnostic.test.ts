import test from 'node:test';
import assert from 'node:assert/strict';
import { scanDiagnostic, scanSourceLabel } from '../scanner/diagnostic.ts';

test('CSG QR diagnostics expose the QR URL and all structured values without claiming authentication',()=>{
 const raw='https://www.cgccards.com/CERTLOOKUP/1012833027/8_5';
 const info=scanDiagnostic(raw,'qr_code','CSG');
 assert.equal(info.source,'QR URL');assert.equal(info.classification,'grader-certification-url');assert.equal(info.raw,raw);assert.equal(info.grader,'CSG');assert.equal(info.cert,'1012833027');assert.equal(info.grade,'8.5');assert.equal(info.verificationUrl,raw);
 assert.deepEqual(info.applied,{grader:'CSG',cert:'1012833027',grade:'8.5',verificationUrl:raw,route:'Manual card details'});
});

test('CSG QR diagnostics distinguish unselected grader from the suggested grader',()=>{
 const raw='https://www.cgccards.com/CERTLOOKUP/1012833027/8_5';const info=scanDiagnostic(raw,'qr_code');
 assert.equal(info.grader,'');assert.equal(info.classification,'grader-certification-url');assert.equal(info.suggestedGrader,'CSG');assert.equal(info.grade,'8.5');assert.equal(info.applied,null);
});

test('CSG Code 128 diagnostics identify barcode-only evidence and no grade or URL',()=>{
 const info=scanDiagnostic('1012833027','code_128','CSG');assert.equal(info.source,'Linear barcode — Code 128');assert.equal(info.raw,'1012833027');assert.equal(info.grader,'CSG');assert.equal(info.cert,'1012833027');assert.equal(info.grade,'');assert.equal(info.verificationUrl,'');assert.equal(info.applied?.cert,'1012833027');
});

test('decoder formats stay distinguishable without assuming grader or cert semantics',()=>{
 assert.equal(scanSourceLabel('abc','code_39'),'Linear barcode — Code 39');
 assert.equal(scanSourceLabel('https://other.test/123456','qr_code'),'QR URL');
 assert.equal(scanDiagnostic('https://other.test/123456','qr_code').grader,'');
});

