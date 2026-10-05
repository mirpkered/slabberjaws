import { test, expect, type Page } from '@playwright/test';

const phoneSizes = [[390, 844], [320, 720], [393, 852]] as const;
const textControlSelector = 'textarea, select, input:not([type="range"]):not([type="file"]):not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="image"])';

async function expectPhoneControlsSafe(page: Page) {
  const sizes = await page.locator(textControlSelector).evaluateAll((controls) => controls
    .filter((control) => {
      const element = control as HTMLElement;
      return element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden';
    })
    .map((control) => ({
      label: (control as HTMLElement).getAttribute('aria-label') || (control as HTMLElement).id || control.tagName,
      size: Number.parseFloat(getComputedStyle(control).fontSize),
    })));
  expect(sizes, JSON.stringify(sizes)).not.toHaveLength(0);
  expect(sizes.filter(({ size }) => size < 16), JSON.stringify(sizes)).toEqual([]);
}

async function expectNoHorizontalOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  const clipped = await page.locator('.modal, .modal *').evaluateAll((elements) => elements
    .filter((element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && (rect.left < -1 || rect.right > document.documentElement.clientWidth + 1);
    })
    .map((element) => `${element.tagName}.${(element as HTMLElement).className}`));
  expect(clipped).toEqual([]);
}

test('phone and compact-landscape forms keep editable text at 16px and retain drafts through rotation/close', async ({ page }) => {
  await page.goto('./', { waitUntil: 'networkidle' });
  for (const [width, height] of phoneSizes) {
    await page.setViewportSize({ width, height });
    await expectPhoneControlsSafe(page);
    await expectNoHorizontalOverflow(page);

    await page.getByRole('textbox', { name: 'Search collection' }).fill('viewport-state');
    await page.evaluate(() => window.scrollTo(0, 320));
    const bodyBaseline = await page.evaluate(() => ({
      inlineStyle: document.body.getAttribute('style'),
      position: getComputedStyle(document.body).position,
      overflow: getComputedStyle(document.body).overflow,
      width: getComputedStyle(document.body).width,
      top: getComputedStyle(document.body).top,
    }));
    const addButton = page.locator('.desktop-add');
    const addTrigger = await addButton.isVisible() ? addButton : page.locator('.floating-add');
    await addTrigger.click();
    await expectPhoneControlsSafe(page);
    await page.getByLabel('Certification number').fill('00409451');
    await page.getByLabel('Grading company').selectOption('CSG');
    await page.getByRole('button', { name: 'Continue to card details' }).click();
    await expectPhoneControlsSafe(page);
    await expect(page.getByLabel('Certification number')).toHaveValue('00409451');
    await page.getByRole('button', { name: 'Photograph slab to fill details' }).click();
    await expectPhoneControlsSafe(page);
    await page.getByRole('button', { name: 'Back to Add Card' }).click();

    const subject = page.getByLabel('Subject / card name');
    await subject.fill('Unsaved viewport test draft');
    await page.setViewportSize({ width: 844, height: 390 });
    await expectPhoneControlsSafe(page);
    await expect(subject).toHaveValue('Unsaved viewport test draft');
    await expectNoHorizontalOverflow(page);

    await page.setViewportSize({ width, height });
    await expect(subject).toHaveValue('Unsaved viewport test draft');
    await page.keyboard.press('Escape');
    await expect(page.locator('.add-modal')).toHaveCount(0);
    await expect(addTrigger).toBeFocused();
    await expect(page.getByRole('textbox', { name: 'Search collection' })).toHaveValue('viewport-state');
    expect(await page.evaluate(() => ({
      inlineStyle: document.body.getAttribute('style'),
      position: getComputedStyle(document.body).position,
      overflow: getComputedStyle(document.body).overflow,
      width: getComputedStyle(document.body).width,
      top: getComputedStyle(document.body).top,
    }))).toEqual(bodyBaseline);
    await expectNoHorizontalOverflow(page);
  }
});

test('account validation failure keeps its draft; Escape closes, blurs and returns focus', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./', { waitUntil: 'networkidle' });
  const menu = page.getByRole('button', { name: 'Open account menu' });
  await menu.click();
  await page.getByRole('button', { name: 'Account', exact: true }).click();
  const email = page.locator('#account-email');
  await email.fill('not-an-email');
  await page.locator('#account-password').fill('test-password');
  await page.locator('.auth-form button[type="submit"]').click();
  await expect(page.locator('.auth-modal')).toBeVisible();
  await expect(email).toHaveValue('not-an-email');
  expect(await email.evaluate((element: HTMLInputElement) => element.validity.typeMismatch)).toBe(true);
  await email.focus();
  await page.keyboard.press('Escape');
  await expect(page.locator('.auth-modal')).toHaveCount(0);
  await expect(menu).toBeFocused();
  expect(await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.matches('input, textarea, [contenteditable="true"]'))).toBe(false);
});

test('detail dialog Escape returns focus to its card and keeps collection view intact', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto('./', { waitUntil: 'networkidle' });
  const card = page.locator('.slab-card').first();
  await expect(card).toBeVisible({ timeout: 15000 });
  await card.click();
  await expect(page.locator('.detail-modal')).toBeVisible();
  await expect(page.locator('.detail-modal .close')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('.detail-modal')).toHaveCount(0);
  await expect(card).toBeFocused();
  await expect(page.getByRole('textbox', { name: 'Search collection' })).toHaveValue('');
  await expectNoHorizontalOverflow(page);
});
