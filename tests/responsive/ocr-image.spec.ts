import { test, expect } from '@playwright/test';

test('Tesseract input is the exact mapped, orientation-normalized crop blob',async({page})=>{
 await page.goto('./',{waitUntil:'networkidle'});
 const result=await page.evaluate(async()=>{
  const loadModule=new Function('return import("/photo/ocr-image.ts")') as ()=>Promise<{prepareOcrImage:typeof import('../../photo/ocr-image.ts').prepareOcrImage}>;
  const {prepareOcrImage}=await loadModule();
  async function check(width:number,height:number){
   const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width/2}" height="${height/2}" fill="#f02020"/><rect x="${width/2}" width="${width/2}" height="${height/2}" fill="#20e020"/><rect y="${height/2}" width="${width/2}" height="${height/2}" fill="#2020f0"/><rect x="${width/2}" y="${height/2}" width="${width/2}" height="${height/2}" fill="#f0e020"/></svg>`;
   const source=new File([svg],`synthetic-${width}x${height}.svg`,{type:'image/svg+xml'});
   const prepared=await prepareOcrImage(source,{x:25,y:25,width:50,height:50},false,true);
   const preview=new Image();preview.src=prepared.inputUrl!;await preview.decode();
   const canvas=document.createElement('canvas');canvas.width=preview.naturalWidth;canvas.height=preview.naturalHeight;canvas.getContext('2d')!.drawImage(preview,0,0);
   const pixel=[...canvas.getContext('2d')!.getImageData(Math.floor(canvas.width*.1),Math.floor(canvas.height*.1),1,1).data];
   const fileBitmap=await createImageBitmap(prepared.file);
   const output={metadata:prepared.metadata,previewWidth:preview.naturalWidth,previewHeight:preview.naturalHeight,fileWidth:fileBitmap.width,fileHeight:fileBitmap.height,pixel,fileBytes:prepared.file.size};
   fileBitmap.close();canvas.width=0;canvas.height=0;URL.revokeObjectURL(prepared.sourceCropUrl!);URL.revokeObjectURL(prepared.inputUrl!);return output;
  }
  return{landscape:await check(400,200),portrait:await check(200,400)};
 });
 for(const item of [result.landscape,result.portrait]){
  expect(item.metadata.crop).toEqual({x:item.metadata.sourceWidth*.25,y:item.metadata.sourceHeight*.25,width:item.metadata.sourceWidth*.5,height:item.metadata.sourceHeight*.5});
  expect(item.previewWidth).toBe(item.fileWidth);expect(item.previewHeight).toBe(item.fileHeight);expect(item.fileBytes).toBeGreaterThan(0);
  expect(item.pixel[0]).toBeGreaterThan(180);expect(item.pixel[1]).toBeLessThan(80);expect(item.pixel[2]).toBeLessThan(80);
 }
 expect(result.landscape.metadata.inputWidth).toBe(200);expect(result.landscape.metadata.inputHeight).toBe(100);
 expect(result.portrait.metadata.inputWidth).toBe(100);expect(result.portrait.metadata.inputHeight).toBe(200);
});
