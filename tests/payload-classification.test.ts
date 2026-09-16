import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyScanPayload } from '../scanner/payload-classification.ts';

test('recognizes only the verified generic GMA destination',()=>{
  assert.deepEqual(classifyScanPayload('https://www.gmagrading.com/gma-free-card-price-guide/?utm=x#top'),{kind:'generic-grader-url',payload:{rawPayload:'https://www.gmagrading.com/gma-free-card-price-guide/?utm=x#top'},suggestedGrader:'GMA'});
  assert.equal(classifyScanPayload('https://gmagrading.com/cert/00409451').kind,'certification');
  assert.equal(classifyScanPayload('https://gmagrading.com/another-page').kind,'unknown-url');
});
test('recognizes only the verified Integrity homepage',()=>{
  assert.equal(classifyScanPayload('http://igscards.com/').kind,'generic-grader-url');
  assert.equal(classifyScanPayload('https://www.igscards.com/verify').kind,'unknown-url');
});
test('Degree certification URLs retain leading-zero certification parsing',()=>{
  assert.deepEqual(classifyScanPayload('https://degreegrading.com/certification/00409451/'),{kind:'certification',payload:{rawPayload:'https://degreegrading.com/certification/00409451/',certNumber:'00409451'}});
});
