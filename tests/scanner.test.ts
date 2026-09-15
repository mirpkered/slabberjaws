import test from 'node:test';
import assert from 'node:assert/strict';
import { parseScanPayload } from '../scanner/payload.ts';
import { startCamera, cameraError } from '../scanner/camera.ts';

for (const [raw, expected] of [
  ['94877724','94877724'], ['00409451','00409451'], [' \n00409452\n ','00409452'],
  ['https://example.com/cert/00409451','00409451'], ['https://example.com/check?certNumber=00409451','00409451'],
  ['PSA CERT 94877724','94877724'], ['CERT:\n272599','272599'],
  ['hello world',undefined], ['00409451 00409452',undefined],
  ['https://example.com/cert/00409451?cert=00409452',undefined], ['ABC123456',undefined],
] as const) test(`scan payload: ${JSON.stringify(raw)}`,()=>assert.deepEqual(parseScanPayload(raw),{rawPayload:raw,...(expected?{certNumber:expected}:{})}));

function fixture() {
  let stops=0, disposed=0, reads=0;
  const track={stop(){stops++;},onended:null,getCapabilities:()=>({torch:true}),applyConstraints:async()=>{}};
  const stream={getTracks:()=>[track],getVideoTracks:()=>[track]} as unknown as MediaStream;
  const video={pause(){},play:async()=>{},srcObject:null,readyState:4,videoWidth:640} as unknown as HTMLVideoElement;
  const errors:string[]=[],payloads:string[]=[];
  const options={video,onRead:(raw:string)=>payloads.push(raw),onError:(message:string)=>errors.push(message),onReady:()=>{}};
  const dependencies={secure:true,getMedia:async()=>stream,decoder:async()=>({decode:async()=>{reads++;return '00409451';},dispose(){disposed++;}})};
  return {options,dependencies,stream,track,errors,payloads,counts:()=>({stops,disposed,reads})};
}
test('first decoded result stops camera and prevents duplicate callbacks',async()=>{
  const f=fixture();const camera=startCamera(f.options,f.dependencies);await camera.ready;
  await new Promise(resolve=>setTimeout(resolve,220));
  assert.deepEqual(f.payloads,['00409451']);assert.deepEqual(f.counts(),{stops:1,disposed:1,reads:1});
  assert.equal(f.options.video.srcObject,null);camera.stop();assert.equal(f.counts().stops,1);
});
test('cancel while permission is pending releases the eventual stream',async()=>{
  const f=fixture();let release!:(stream:MediaStream)=>void;
  const camera=startCamera(f.options,{...f.dependencies,getMedia:()=>new Promise(resolve=>{release=resolve;})});
  camera.stop();release(f.stream);await camera.ready;
  assert.equal(f.counts().stops,1);assert.equal(f.counts().reads,0);assert.deepEqual(f.payloads,[]);
});
test('rescan creates a fresh session after the previous one was stopped',async()=>{
  const first=fixture();const a=startCamera(first.options,first.dependencies);a.stop();await a.ready;
  const second=fixture();const b=startCamera(second.options,second.dependencies);await b.ready;
  assert.deepEqual(first.payloads,[]);assert.deepEqual(second.payloads,['00409451']);b.stop();
});
test('camera interruption, permission denial, unsupported and insecure contexts have fallback messages',async()=>{
  for(const deps of [{secure:false},{getMedia:undefined},{getMedia:async()=>{throw new DOMException('denied','NotAllowedError');}}]){
    const f=fixture();await startCamera(f.options,{...f.dependencies,...deps}).ready;
    assert.equal(f.errors.length,1);assert.match(f.errors[0],/manually/i);assert.deepEqual(f.payloads,[]);
  }
  assert.match(cameraError(new DOMException('busy','NotReadableError')),/busy/);
  assert.match(cameraError(new DOMException('missing','NotFoundError')),/No usable camera/);
});
test('initialization failure stops already acquired camera tracks',async()=>{
  const f=fixture();await startCamera(f.options,{...f.dependencies,decoder:async()=>{throw new Error('init');}}).ready;
  assert.equal(f.counts().stops,1);assert.equal(f.errors.length,1);assert.equal(f.options.video.srcObject,null);
});
