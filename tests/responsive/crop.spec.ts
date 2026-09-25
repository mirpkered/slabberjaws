import { test, expect } from '@playwright/test';

test('photo crop responds to touch pointers and stays within the displayed photograph',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('./',{waitUntil:'networkidle'});
  await page.locator('.desktop-add').click();await page.getByRole('button',{name:'Photograph Slab'}).click();
  await page.getByLabel('Grading company').selectOption('CSG');await page.getByRole('button',{name:'Continue to photos'}).click();
  const svg='<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1600"><rect width="1200" height="1600" fill="#ddd"/><rect x="150" y="80" width="900" height="260" fill="#fff" stroke="#00aaff" stroke-width="12"/><text x="200" y="220" font-size="90">LABEL</text></svg>';
  await page.locator('input[type=file]').setInputFiles({name:'synthetic-slab.svg',mimeType:'image/svg+xml',buffer:Buffer.from(svg)});
  const image=page.locator('.crop-image-frame > img');await expect(image).toBeVisible();await expect.poll(()=>image.evaluate(el=>(el as HTMLImageElement).naturalWidth)).toBe(1200);
  const geometry=await page.evaluate(()=>{const stage=document.querySelector('.crop-stage')!.getBoundingClientRect(),frame=document.querySelector('.crop-image-frame')!.getBoundingClientRect();return {stage:{width:stage.width,height:stage.height},frame:{left:frame.left-stage.left,top:frame.top-stage.top,width:frame.width,height:frame.height}};});
  expect(geometry.frame.width).toBeLessThan(geometry.stage.width);expect(geometry.frame.height).toBeCloseTo(geometry.stage.height,0);
  const before=await page.locator('.crop-box').evaluate(el=>({width:(el as HTMLElement).style.width,left:(el as HTMLElement).style.left}));
  const handle=await page.locator('.crop-handle').boundingBox();expect(handle).not.toBeNull();const hx=handle!.x+handle!.width/2,hy=handle!.y+handle!.height/2;
  await page.mouse.move(hx,hy);await page.mouse.down();await page.mouse.move(hx-60,hy-60,{steps:4});await page.mouse.up();
  await expect.poll(async()=>parseFloat(await page.locator('.crop-box').evaluate(el=>(el as HTMLElement).style.width))).toBeLessThan(parseFloat(before.width));
  const cropBox=await page.locator('.crop-box').boundingBox();expect(cropBox).not.toBeNull();const cx=cropBox!.x+cropBox!.width/2,cy=cropBox!.y+cropBox!.height/2;
  await page.mouse.move(cx,cy);await page.mouse.down();await page.mouse.move(cx+25,cy+20,{steps:3});await page.mouse.up();
  const moved=await page.locator('.crop-box').evaluate(el=>({left:(el as HTMLElement).style.left,top:(el as HTMLElement).style.top}));expect(parseFloat(moved.left)).toBeGreaterThan(0);expect(parseFloat(moved.top)).toBeGreaterThan(0);
  expect(await page.locator('.crop-box').evaluate(el=>getComputedStyle(el).touchAction)).toBe('none');
  await page.getByRole('button',{name:'Reset to full photograph'}).click();await expect(page.locator('.crop-box')).toHaveCSS('width',`${geometry.frame.width}px`);
});
