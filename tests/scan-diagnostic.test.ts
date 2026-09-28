import test from 'node:test';
import assert from 'node:assert/strict';
import { scanDiagnostic, scanSourceLabel } from '../scanner/diagnostic.ts';

test('CSG QR diagnostics expose the QR URL and all structured values without claiming authentication',()=>{
 const raw='https://www.cgccards.com/CERTLOOKUP/1012833027/8_5/';
 assert.deepEqual(scanDiagnostic(raw,'qr_code','CSG'),{source:'QR URL',raw,grader:'CSG',cert:'1012833027',grade:'8.5',verificationUrl:raw});
});

test('CSG Code 128 diagnostics identify barcode-only evidence and no grade or URL',()=>{
 assert.deepEqual(scanDiagnostic('1012833027','code_128','CSG'),{source:'Linear barcode — Code 128',raw:'1012833027',grader:'CSG',cert:'1012833027',grade:'',verificationUrl:''});
});

test('decoder formats stay distinguishable without assuming grader or cert semantics',()=>{
 assert.equal(scanSourceLabel('abc','code_39'),'Linear barcode — Code 39');
 assert.equal(scanSourceLabel('https://other.test/123456','qr_code'),'QR URL');
 assert.equal(scanDiagnostic('https://other.test/123456','qr_code').grader,'');
});
