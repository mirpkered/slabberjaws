import { test, expect, type Page } from '@playwright/test';

const sizes = [[320,568],[375,667],[390,844],[430,932],[768,1024],[1024,768],[1440,900]];
async function fits(page: Page) {
  const overflow = await page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    return [...document.querySelectorAll('body *')].filter(el => {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return rect.width && rect.height && style.visibility !== 'hidden' && (rect.right > width + 1 || rect.left < -1);
    }).map(el => `${el.tagName}.${el.className}`);
  });
  expect(overflow).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}
for (const [width,height] of sizes) {
  test(`${width}px collection and nested dialogs fit`, async ({page}, testInfo) => {
    await page.setViewportSize({width,height});
    // Only intercept lookup, never contact or modify a real collection account.
    await page.route('**/api/lookup/**', route => route.fulfill({json:{ok:false,code:'GRADER_UNAVAILABLE',message:'The certification lookup service could not be reached.'}}));
    await page.route('**/functions/v1/lookup', route => route.fulfill({json:{ok:false,code:'GRADER_UNAVAILABLE',message:'The certification lookup service could not be reached.'}}));
    await page.goto('./', {waitUntil:'networkidle'});
    await expect(page.locator('.slab-card').first()).toBeVisible();
    await fits(page);
    await page.screenshot({path:testInfo.outputPath('collection.png')});
    await page.getByRole('textbox',{name:'Search collection'}).fill('no-match-responsive-test');
    await expect(page.locator('.empty')).toBeVisible();
    await fits(page);
    await page.getByRole('textbox',{name:'Search collection'}).fill('');
    await page.locator('.slab-card').first().click();
    await fits(page);
    await page.screenshot({path:testInfo.outputPath('detail.png')});
    await page.locator('.detail-modal .close').click();
    await page.locator('.account-button').click();
    await fits(page);
    await page.getByRole('button',{name:'Create Account',exact:true}).first().click();
    await fits(page);
    await page.locator('.auth-modal .close').click();
    await page.locator('.desktop-add').click();
    await fits(page);
    await page.getByLabel('Certification number').fill('00409451');
    await page.getByRole('button',{name:'Look up certificate'}).click();
    await expect(page.locator('.lookup-failed')).toBeVisible();
    await fits(page);
    for (const button of await page.locator('.lookup-failed button').all()) {
      const box = await button.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);
    }
    await page.screenshot({path:testInfo.outputPath('lookup-failure.png')});
    await page.getByRole('button',{name:'Enter manually'}).click();
    await fits(page);
    await expect(page.locator('.identity code')).toHaveText('00409451');
    await page.screenshot({path:testInfo.outputPath('manual.png')});
    await page.locator('.add-modal .close').click();
    await page.reload({waitUntil:'networkidle'});
    const card={id:'fixture',grader:'Degree',certNumber:'00409451',grade:'9',year:'1993',brand:'Topps',set:'Representative long set name for responsive verification',subject:'Representative card subject with a long name',cardNumber:'14',variant:'',frontImageUrl:'',backImageUrl:'',certUrl:'',population:1,graderSpecific:{},addedAt:'2026-09-14'};
    await page.route('**/api/lookup/**',route=>route.fulfill({json:{ok:true,card}}));
    await page.route('**/functions/v1/lookup',route=>route.fulfill({json:{ok:true,card}}));
    await page.locator('.desktop-add').click();
    await page.getByLabel('Certification number').fill('00409451');
    await page.getByRole('button',{name:'Look up certificate'}).click();
    await expect(page.locator('.lookup-preview')).toBeVisible();
    await fits(page);
    await page.screenshot({path:testInfo.outputPath('preview.png')});
  });
}
