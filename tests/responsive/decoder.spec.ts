import { test, expect } from '@playwright/test';
import * as ZXingModule from '@zxing/library';

const ZXing = (ZXingModule as unknown as {default?:typeof ZXingModule}).default ?? ZXingModule;
const {QRCodeWriter, BarcodeFormat} = ZXing;

test('ZXing fallback decodes QR pixels and tolerates a blank frame',async({page})=>{
  test.skip(Boolean(process.env.RESPONSIVE_BASE_URL),'Source-module decoder test runs against the local test server.');
  const matrix=new QRCodeWriter().encode('00409451',BarcodeFormat.QR_CODE,240,240,new Map());
  const pixels=Array.from({length:240},(_,y)=>Array.from({length:240},(_,x)=>matrix.get(x,y)));
  await page.goto('./',{waitUntil:'networkidle'});
  const result=await page.evaluate(async pixels=>{
    Object.defineProperty(window,'BarcodeDetector',{configurable:true,value:undefined});
    const path='/scanner/decoder.ts';
    const {createDecoder}=await import(path);
    const decoder=await createDecoder();
    const canvas=document.createElement('canvas');canvas.width=240;canvas.height=240;
    Object.defineProperties(canvas,{videoWidth:{value:240},videoHeight:{value:240}});
    const context=canvas.getContext('2d')!;
    context.fillStyle='white';context.fillRect(0,0,240,240);
    const blank=await decoder.decode(canvas);
    context.fillStyle='black';pixels.forEach((row,y)=>row.forEach((black,x)=>{if(black)context.fillRect(x,y,1,1);}));
    const text=await decoder.decode(canvas);decoder.dispose();return {blank:blank??null,text};
  },pixels);
  expect(result).toEqual({blank:null,text:'00409451'});
});

test('ZXing fallback preserves a Degree-style verification URL and leading zeroes',async({page})=>{
  test.skip(Boolean(process.env.RESPONSIVE_BASE_URL),'Source-module decoder test runs against the local test server.');
  const raw='https://degreegrading.com/certification/00409451/';
  const matrix=new QRCodeWriter().encode(raw,BarcodeFormat.QR_CODE,300,300,new Map());
  const pixels=Array.from({length:300},(_,y)=>Array.from({length:300},(_,x)=>matrix.get(x,y)));
  await page.goto('./',{waitUntil:'networkidle'});
  const result=await page.evaluate(async ({pixels,raw})=>{
    Object.defineProperty(window,'BarcodeDetector',{configurable:true,value:undefined});
    const decoderPath='/scanner/decoder.ts', payloadPath='/scanner/payload.ts';
    const {createDecoder}=await import(decoderPath); const {parseScanPayload}=await import(payloadPath);
    const decoder=await createDecoder(), canvas=document.createElement('canvas');canvas.width=300;canvas.height=300;
    Object.defineProperties(canvas,{videoWidth:{value:300},videoHeight:{value:300}});const context=canvas.getContext('2d')!;
    context.fillStyle='white';context.fillRect(0,0,300,300);context.fillStyle='black';pixels.forEach((row,y)=>row.forEach((black,x)=>{if(black)context.fillRect(x,y,1,1);}));
    const decoded=await decoder.decode(canvas);decoder.dispose();return {decoded,normalized:parseScanPayload(decoded??raw)};
  },{pixels,raw});
  expect(result).toEqual({decoded:raw,normalized:{rawPayload:raw,certNumber:'00409451'}});
});
