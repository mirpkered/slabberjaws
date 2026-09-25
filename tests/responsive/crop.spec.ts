import { test, expect } from '@playwright/test';

test('photo crop responds to pointer resizing and stays within the displayed photograph',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('./',{waitUntil:'networkidle'});
  await page.locator('.desktop-add').click();await page.getByRole('button',{name:'Photograph Slab'}).click();
  await page.getByLabel('Grading company').selectOption('CSG');await page.getByRole('button',{name:'Continue to photos'}).click();
  const svg='<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1600"><rect width="1200" height="1600" fill="#ddd"/><rect x="150" y="80" width="900" height="260" fill="#fff" stroke="#00aaff" stroke-width="12"/><text x="200" y="220" font-size="90">LABEL</text></svg>';
  await page.locator('input[type=file]').setInputFiles({name:'synthetic-slab.svg',mimeType:'image/svg+xml',buffer:Buffer.from(svg)});
  const image=page.locator('.crop-image-frame > img');await expect(image).toBeVisible();await expect.poll(()=>image.evaluate(el=>(el as HTMLImageElement).naturalWidth)).toBe(1200);
  const geometry=await page.evaluate(()=>{const stage=document.querySelector('.crop-stage')!.getBoundingClientRect(),frame=document.querySelector('.crop-image-frame')!.getBoundingClientRect();return {stage:{width:stage.width,height:stage.height},frame:{left:frame.left-stage.left,top:frame.top-stage.top,width:frame.width,height:frame.height}};});
  expect(geometry.frame.width).toBeLessThan(geometry.stage.width);expect(geometry.frame.height).toBeCloseTo(geometry.stage.height,0);
  const before=await page.locator('.crop-box').evaluate(el=>({width:(el as HTMLElement).style.width,left:(el as HTMLElement).style.left}));
  const handle=await page.locator('.crop-handle-bottom-right').boundingBox();expect(handle).not.toBeNull();const hx=handle!.x+handle!.width/2,hy=handle!.y+handle!.height/2;
  await page.mouse.move(hx,hy);await page.mouse.down();await page.mouse.move(hx-60,hy-60,{steps:4});await page.mouse.up();
  await expect.poll(async()=>parseFloat(await page.locator('.crop-box').evaluate(el=>(el as HTMLElement).style.width))).toBeLessThan(parseFloat(before.width));
  expect(await page.locator('.crop-box').evaluate(el=>getComputedStyle(el).touchAction)).toBe('none');
  await page.getByRole('button',{name:'Reset to full photograph'}).click();await expect(page.locator('.crop-box')).toHaveCSS('width',`${geometry.frame.width}px`);
});

test('all four corner controls resize with pointer gestures and retain the captured image through label crop',async({page})=>{
  test.setTimeout(120000);
  await page.setViewportSize({width:390,height:844});await page.goto('./',{waitUntil:'networkidle'});
  await page.locator('.desktop-add').click();await page.getByRole('button',{name:'Photograph Slab'}).click();
  await page.getByLabel('Grading company').selectOption('CSG');await page.getByRole('button',{name:'Continue to photos'}).click();
  const svg='<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1600"><rect width="1200" height="1600" fill="#ddd"/><rect x="150" y="80" width="900" height="260" fill="#fff" stroke="#00aaff" stroke-width="12"/><text x="200" y="220" font-size="90">LABEL</text></svg>';
  await page.locator('input[type=file]').setInputFiles({name:'synthetic-slab.svg',mimeType:'image/svg+xml',buffer:Buffer.from(svg)});
  const image=page.locator('.crop-image-frame > img');await expect(image).toBeVisible();await expect.poll(()=>image.evaluate(el=>(el as HTMLImageElement).naturalWidth)).toBe(1200);
  const dragPointer=async(selector:string,dx:number,dy:number)=>{
    const rect=await page.locator(selector).boundingBox();expect(rect).not.toBeNull();const x=rect!.x+rect!.width/2,y=rect!.y+rect!.height/2;
    await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+dx,y+dy,{steps:3});await page.mouse.up();
  };
  await dragPointer('.crop-handle-top-left',48,48);
  await expect.poll(()=>page.locator('.crop-box').evaluate(el=>parseFloat((el as HTMLElement).style.left))).toBeGreaterThan(0);await expect.poll(()=>page.locator('.crop-box').evaluate(el=>parseFloat((el as HTMLElement).style.top))).toBeGreaterThan(0);
  const topLeft=await page.locator('.crop-box').evaluate(el=>({x:parseFloat((el as HTMLElement).style.left),y:parseFloat((el as HTMLElement).style.top)}));expect(topLeft.x).toBeGreaterThan(0);expect(topLeft.y).toBeGreaterThan(0);
  let before=await page.locator('.crop-box').evaluate(el=>({x:parseFloat((el as HTMLElement).style.left),y:parseFloat((el as HTMLElement).style.top),w:parseFloat((el as HTMLElement).style.width),h:parseFloat((el as HTMLElement).style.height)}));
  await dragPointer('.crop-handle-top-right',-32,32);await expect.poll(()=>page.locator('.crop-box').evaluate(el=>parseFloat((el as HTMLElement).style.top))).toBeGreaterThan(before.y);let after=await page.locator('.crop-box').evaluate(el=>({x:parseFloat((el as HTMLElement).style.left),y:parseFloat((el as HTMLElement).style.top),w:parseFloat((el as HTMLElement).style.width),h:parseFloat((el as HTMLElement).style.height)}));expect(after.x).toBe(before.x);expect(after.y).toBeGreaterThan(before.y);expect(after.w).toBeLessThan(before.w);
  before=after;await dragPointer('.crop-handle-bottom-left',32,-32);await expect.poll(()=>page.locator('.crop-box').evaluate(el=>parseFloat((el as HTMLElement).style.left))).toBeGreaterThan(before.x);after=await page.locator('.crop-box').evaluate(el=>({x:parseFloat((el as HTMLElement).style.left),y:parseFloat((el as HTMLElement).style.top),w:parseFloat((el as HTMLElement).style.width),h:parseFloat((el as HTMLElement).style.height)}));expect(after.x).toBeGreaterThan(before.x);expect(after.y).toBe(before.y);expect(after.w).toBeLessThan(before.w);
  before=after;await dragPointer('.crop-handle-bottom-right',-32,-32);await expect.poll(()=>page.locator('.crop-box').evaluate(el=>parseFloat((el as HTMLElement).style.width))).toBeLessThan(before.w);after=await page.locator('.crop-box').evaluate(el=>({x:parseFloat((el as HTMLElement).style.left),y:parseFloat((el as HTMLElement).style.top),w:parseFloat((el as HTMLElement).style.width),h:parseFloat((el as HTMLElement).style.height)}));expect(after.x).toBe(before.x);expect(after.y).toBe(before.y);expect(after.w).toBeLessThan(before.w);expect(after.h).toBeLessThan(before.h);
  for(const corner of ['top-left','top-right','bottom-left','bottom-right']){const handle=page.locator(`.crop-handle-${corner}`);await expect(handle).toHaveCSS('touch-action','none');expect((await handle.boundingBox())?.width).toBeGreaterThanOrEqual(44);}
  before=after;await dragPointer('.crop-box',24,24);await expect.poll(()=>page.locator('.crop-box').evaluate(el=>parseFloat((el as HTMLElement).style.left))).toBeGreaterThan(before.x);await expect.poll(()=>page.locator('.crop-box').evaluate(el=>parseFloat((el as HTMLElement).style.top))).toBeGreaterThan(before.y);
  const frontSrc=await image.getAttribute('src');
  await page.getByRole('button',{name:'Confirm whole-slab crop'}).click();await expect(page.getByRole('heading',{name:'Select the grading label, if helpful'})).toBeVisible();
  await expect(page.locator('.crop-image-frame > img')).toHaveAttribute('src',frontSrc!);
  await page.getByRole('button',{name:'Use label crop'}).click();
  await expect(page.getByRole('heading',{name:'Photograph the back of the slab'})).toBeVisible();
  await expect(page.locator('input[type=file]')).toBeAttached();
  const backSvg='<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000"><rect width="1600" height="1000" fill="#eee"/><text x="100" y="150" font-size="80">CERTIFICATION LABEL</text></svg>';
  await page.locator('input[type=file]').setInputFiles({name:'synthetic-back.svg',mimeType:'image/svg+xml',buffer:Buffer.from(backSvg)});
  await page.getByRole('button',{name:'Confirm whole-slab crop'}).click();await page.getByRole('button',{name:'Use label crop'}).click();
  await expect(page.getByRole('heading',{name:'Review crops'})).toBeVisible();await expect(page.locator('.photo-review-grid img')).toHaveCount(2);await expect(page.locator('.photo-review-grid img').first()).toHaveAttribute('src',frontSrc!);
  await expect(page.getByRole('button',{name:'Read label text'})).toBeVisible();
  await page.getByRole('button',{name:'Adjust crop'}).first().click();await expect(page.getByRole('heading',{name:'Remove surrounding background'})).toBeVisible();
  await page.getByRole('button',{name:'Confirm whole-slab crop'}).click();await expect(page.getByRole('heading',{name:'Select the grading label, if helpful'})).toBeVisible();
  await page.getByRole('button',{name:'Use label crop'}).click();await expect(page.getByRole('heading',{name:'Review crops'})).toBeVisible();
  await expect(page.locator('.photo-review-grid img').first()).toHaveAttribute('src',frontSrc!);
});

test('skip label crop keeps the front capture and goes to review without recapturing',async({page})=>{
  await page.setViewportSize({width:375,height:667});await page.goto('./',{waitUntil:'networkidle'});await page.locator('.desktop-add').click();await page.getByRole('button',{name:'Photograph Slab'}).click();
  await page.getByLabel('Grading company').selectOption('C3G');await page.getByRole('button',{name:'Continue to photos'}).click();
  const svg='<svg xmlns="http://www.w3.org/2000/svg" width="640" height="900"><rect width="640" height="900" fill="white"/><text x="80" y="100" font-size="50">2021 TOPPS</text></svg>';
  await page.locator('input[type=file]').setInputFiles({name:'synthetic-front.svg',mimeType:'image/svg+xml',buffer:Buffer.from(svg)});const source=await page.locator('.crop-image-frame img').getAttribute('src');
  await page.getByRole('button',{name:'Confirm whole-slab crop'}).click();await page.getByRole('button',{name:'Skip label crop'}).click();await expect(page.getByRole('heading',{name:'Photograph the back of the slab'})).toBeVisible();
  await page.getByRole('button',{name:'Continue with front only'}).click();await expect(page.getByRole('heading',{name:'Review crops'})).toBeVisible();await expect(page.locator('.photo-review-grid img')).toHaveAttribute('src',source!);
});
