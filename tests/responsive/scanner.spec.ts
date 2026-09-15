import { test, expect, type Page } from '@playwright/test';

async function cameraMock(page: Page) {
  await page.addInitScript(() => {
    const state={raw:'',denied:false,stops:0,requests:0,torch:false};
    Object.assign(window,{scanTest:state});
    Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>{
      state.requests++;if(state.denied)throw new DOMException('denied','NotAllowedError');
      const track={stop(){state.stops++;},onended:null,getCapabilities:()=>({torch:true}),applyConstraints:async(value:{advanced:Array<{torch:boolean}>})=>{state.torch=value.advanced[0].torch;}};
      return {getTracks:()=>[track],getVideoTracks:()=>[track]};
    }}});
    Object.defineProperty(HTMLMediaElement.prototype,'srcObject',{configurable:true,get(){return null;},set(){}});
    Object.defineProperty(HTMLMediaElement.prototype,'readyState',{configurable:true,get:()=>4});
    Object.defineProperty(HTMLVideoElement.prototype,'videoWidth',{configurable:true,get:()=>640});
    Object.defineProperty(HTMLVideoElement.prototype,'videoHeight',{configurable:true,get:()=>480});
    HTMLMediaElement.prototype.play=async()=>{};HTMLMediaElement.prototype.pause=()=>{};
    Object.assign(window,{BarcodeDetector:class {
      static async getSupportedFormats(){return ['code_128','code_39','ean_13','ean_8','upc_a','upc_e','qr_code'];}
      async detect(){return state.raw?[{rawValue:state.raw}]:[];}
    }});
  });
}
async function state(page:Page,raw:string) {await page.evaluate(value=>{(window as unknown as {scanTest:{raw:string}}).scanTest.raw=value;},raw);}
async function fits(page:Page){expect(await page.evaluate(()=>({document:document.documentElement.scrollWidth<=innerWidth,elements:[...document.querySelectorAll('.add-modal, .add-modal *')].every(el=>{const r=el.getBoundingClientRect();return !r.width || (r.left>=0&&r.right<=innerWidth+1);})}))).toEqual({document:true,elements:true});}
for(const [width,height] of [[320,568],[375,667],[390,844],[430,932],[768,1024],[1024,768],[1440,900]]){
  test(`scanner ${width}px confirmation and unavailable lookup`,async({page},info)=>{
    await cameraMock(page);await page.setViewportSize({width,height});
    const requests:string[]=[];
    await page.route('**/api/lookup/**',route=>{requests.push(route.request().url());return route.fulfill({json:{ok:false,code:'GRADER_UNAVAILABLE',message:'Lookup unavailable.'}});});
    await page.route('**/functions/v1/lookup',route=>{requests.push(route.request().postData()??'');return route.fulfill({json:{ok:false,code:'GRADER_UNAVAILABLE',message:'Lookup unavailable.'}});});
    await page.goto('./',{waitUntil:'networkidle'});await page.locator('.desktop-add').click();await page.getByRole('button',{name:'Scan Slab',exact:true}).click();
    await expect(page.getByRole('button',{name:'Turn flashlight on'})).toBeVisible();await fits(page);
    const geometry=await page.evaluate(()=>{const camera=document.querySelector('.scan-camera')!.getBoundingClientRect(),target=document.querySelector('.scan-target')!.getBoundingClientRect(),video=document.querySelector('.scan-camera video')!;return {ratio:camera.width/camera.height,objectFit:getComputedStyle(video).objectFit,targetInside:target.left>=camera.left&&target.right<=camera.right&&target.top>=camera.top&&target.bottom<=camera.bottom};});
    expect(geometry.objectFit).toBe('cover');expect(geometry.targetInside).toBe(true);expect(geometry.ratio).toBeGreaterThan(width<=640?.45:1.2);expect(geometry.ratio).toBeLessThan(width<=640?1.15:1.45);
    await page.getByRole('button',{name:'Turn flashlight on'}).click();
    await state(page,'https://example.com/cert/00409451');
    await expect(page.getByRole('heading',{name:'Which grading company is this?'})).toBeVisible();await fits(page);
    await expect(page.getByRole('button',{name:'Look up certification',exact:true})).toBeDisabled();
    expect(requests).toHaveLength(0);
    await expect(page.getByLabel('Decoded certification number')).toHaveValue('00409451');
    await expect(page.locator('.scan-entry video')).toHaveCount(0);
    expect(await page.evaluate(()=>(window as unknown as {scanTest:{stops:number}}).scanTest.stops)).toBe(1);
    await page.getByLabel('Grading company').selectOption('PSA');
    await page.screenshot({path:info.outputPath('scan-confirm.png')});
    await page.getByRole('button',{name:'Look up certification',exact:true}).click();
    await expect(page.locator('.lookup-failed')).toBeVisible();await fits(page);
    expect(requests).toHaveLength(1);expect(requests[0].toLowerCase()).toContain('psa');expect(requests[0]).toContain('00409451');
    await page.getByRole('button',{name:'Enter manually',exact:true}).click();
    await expect(page.locator('.identity')).toContainText('PSA');await expect(page.locator('.identity')).toContainText('00409451');await fits(page);
  });
}
test('scanner cancel, rescan, unsupported text, permission denial and close release resources',async({page})=>{
  await cameraMock(page);await page.goto('./',{waitUntil:'networkidle'});await page.locator('.desktop-add').click();
  await page.getByRole('button',{name:'Scan Slab',exact:true}).click();
  await expect(page.getByRole('button',{name:'Turn flashlight on'})).toBeVisible();
  await page.getByRole('button',{name:'Cancel scan'}).click();
  expect(await page.evaluate(()=>(window as unknown as {scanTest:{stops:number}}).scanTest.stops)).toBe(1);
  await page.getByRole('button',{name:'Scan Slab',exact:true}).click();await state(page,'unsupported text');
  await expect(page.getByLabel('Decoded certification number')).toHaveValue('');
  await state(page,'');await page.getByRole('button',{name:'Rescan',exact:true}).click();
  await expect(page.locator('.scan-entry video')).toBeVisible();await state(page,'00409452');
  await expect(page.getByLabel('Decoded certification number')).toHaveValue('00409452');
  await page.getByRole('button',{name:'Enter Cert Manually',exact:true}).click();
  await expect(page.getByLabel('Certification number',{exact:true})).toHaveValue('00409452');
  await page.evaluate(()=>{(window as unknown as {scanTest:{denied:boolean}}).scanTest.denied=true;});
  await page.getByRole('button',{name:'Scan Slab',exact:true}).click();await expect(page.getByRole('status')).toContainText('denied');
  await page.locator('.add-modal .close').click();await page.locator('.desktop-add').click();
  // Closing discards the entire scan component, including raw payload/confirmation.
  await expect(page.getByLabel('Decoded certification number')).toHaveCount(0);
});
