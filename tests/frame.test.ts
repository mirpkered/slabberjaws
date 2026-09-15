import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceRect } from '../scanner/frame.ts';

test('maps a cover-fitted overlay to source-video pixels',()=>{
  const mapped=sourceRect({width:1920,height:1080},{x:0,y:0,width:390,height:600},{x:27,y:180,width:336,height:240});
  assert.deepEqual(mapped,{x:657.6,y:324,width:604.8,height:432});
});
