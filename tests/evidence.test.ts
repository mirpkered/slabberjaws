import test from 'node:test';
import assert from 'node:assert/strict';
import { createManualCard } from '../lookup/manual.ts';
import { mergeCardEvidence, photoEvidence, sourceCard } from '../photo/evidence.ts';
import { emptyPhotoFields, extractPhotoFields } from '../photo/extract.ts';
import { confirmedScanHandoff } from '../scanner/handoff.ts';

test('CSG scan evidence retains its cert, editable QR grade and complete verification URL',()=>{
 const url='https://www.cgccards.com/CERTLOOKUP/1012833027/8_5/';
 const handoff=confirmedScanHandoff(url,'CSG','1012833027','8.5');assert.deepEqual(handoff,{kind:'manual',grader:'CSG',certNumber:'1012833027',certUrl:url,grade:'8.5'});
 const base=createManualCard('CSG','1012833027');const merged=mergeCardEvidence(base,{}, {grader:'CSG',certNumber:'1012833027',grade:'8.5',certUrl:url},{grader:'manual',certNumber:'scan',grade:'scan',certUrl:'scan'});
 assert.equal(merged.card.grader,'CSG');assert.equal(merged.card.certNumber,'1012833027');assert.equal(merged.card.grade,'8.5');assert.equal(merged.card.certUrl,url);
});

test('C3G scanner evidence preserves cert URL and does not fabricate a grade',()=>{
 const url='https://www.c3-grading.com/Reports-1008/4301/10084351';const handoff=confirmedScanHandoff(url,'C3G','10084351');assert.deepEqual(handoff,{kind:'manual',grader:'C3G',certNumber:'10084351',certUrl:url});
 const base=createManualCard('C3G','10084351');const merged=mergeCardEvidence(base,{}, {grader:'C3G',certNumber:'10084351',certUrl:url},{grader:'manual',certNumber:'scan',certUrl:'scan'});
 assert.equal(merged.card.grade,'');assert.equal(merged.card.certUrl,url);
});

test('photo evidence fills missing fields but a conflicting OCR grade cannot replace QR grade',()=>{
 const base={...createManualCard('CSG','1012833027'),grade:'8.5',certUrl:'https://www.cgccards.com/CERTLOOKUP/1012833027/8_5/'};
 const sources={grader:'manual' as const,certNumber:'scan' as const,grade:'scan' as const,certUrl:'scan' as const};
 const photoFields={...emptyPhotoFields(),certNumber:'1012833027',grade:'8.5',year:'2021',brand:'Topps',cardNumber:'285',subject:'Dylan Carlson'};
 const incoming=photoEvidence(photoFields,'CSG',{year:'ocr',brand:'ocr',cardNumber:'ocr',subject:'ocr'});
 const merged=mergeCardEvidence(base,sources,incoming.patch,incoming.sources);
 assert.deepEqual({grader:merged.card.grader,cert:merged.card.certNumber,grade:merged.card.grade,year:merged.card.year,brand:merged.card.brand,cardNumber:merged.card.cardNumber,subject:merged.card.subject,url:merged.card.certUrl},{grader:'CSG',cert:'1012833027',grade:'8.5',year:'2021',brand:'Topps',cardNumber:'285',subject:'Dylan Carlson',url:base.certUrl});
 const conflict=mergeCardEvidence(merged.card,merged.sources,{grade:'8'},{grade:'ocr'});assert.equal(conflict.card.grade,'8.5');assert.equal(conflict.conflicts[0]?.incoming,'8');
 const accepted=mergeCardEvidence(merged.card,merged.sources,{grade:'8'},{grade:'manual'});assert.equal(accepted.card.grade,'8');assert.equal(accepted.conflicts.length,0);
});

test('explicit manual edits outrank later OCR and scan additions within the session',()=>{
 const card={...createManualCard('CSG','1012833027'),subject:'Corrected Subject'};const sources=sourceCard(card,'manual');
 const next=mergeCardEvidence(card,sources,{subject:'OCR guess',grade:'8.5'},{subject:'ocr',grade:'scan'});
 assert.equal(next.card.subject,'Corrected Subject');assert.equal(next.card.grade,'8.5');assert.equal(next.conflicts.length,1);
 const cleared=mergeCardEvidence(card,sources,{subject:''},{subject:'manual'});assert.equal(cleared.card.subject,'');
});

test('photo candidate extraction can be tested without the OCR engine or network',()=>{
 const parsed=extractPhotoFields('CSG\n2021 Topps\n#285 Dylan Carlson\n8.5\n1012833027');
 assert.ok(parsed.candidates.some(item=>item.field==='year'&&item.value==='2021'));
 assert.ok(parsed.candidates.some(item=>item.field==='brand'&&item.value==='Topps'));
 assert.ok(parsed.candidates.some(item=>item.field==='cardNumber'&&item.value==='285'));
 assert.ok(parsed.candidates.some(item=>item.field==='subject'&&item.value==='Dylan Carlson'));
 assert.ok(parsed.candidates.some(item=>item.field==='grade'&&item.value==='8.5'));
 assert.ok(parsed.candidates.some(item=>item.field==='certNumber'&&item.value==='1012833027'));
});
